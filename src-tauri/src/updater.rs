//! Проверка и установка обновлений через GitHub Releases.

use futures_util::StreamExt;
use serde::Serialize;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};

/// Публичный файл релиза (без GitHub API — нет лимита 403).
const LATEST_YML: &str =
    "https://github.com/nickeynnick/Eva-style/releases/latest/download/latest.yml";
/// Atom-лента релизов — запасной канал, если CDN latest.yml отвечает 400/ошибкой.
const RELEASES_ATOM: &str = "https://github.com/nickeynnick/Eva-style/releases.atom";
const DOWNLOAD_BASE: &str =
    "https://github.com/nickeynnick/Eva-style/releases/latest/download";
const DOWNLOAD_TAG_BASE: &str =
    "https://github.com/nickeynnick/Eva-style/releases/download";
const GH_STATUS: &str = "https://www.githubstatus.com/api/v2/status.json";
/// Только ASCII: кириллица в User-Agent даёт HTTP 400 на части CDN/прокси.
const USER_AGENT: &str = "Eva-style-updater/nickeynnick-Eva-style";

#[derive(Default)]
pub struct PendingUpdate {
    pub version: String,
    pub notes: String,
    pub url: String,
    pub installer: Option<PathBuf>,
}

pub type PendingUpdateState = Mutex<Option<PendingUpdate>>;

#[derive(Serialize, Clone)]
#[serde(tag = "type", rename_all = "kebab-case")]
enum UpdateEvent {
    Checking {
        #[serde(rename = "currentVersion")]
        current_version: String,
    },
    Available {
        version: String,
        #[serde(rename = "currentVersion")]
        current_version: String,
        #[serde(rename = "releaseNotes")]
        release_notes: String,
        manual: bool,
    },
    #[serde(rename = "not-available")]
    NotAvailable {
        #[serde(rename = "currentVersion")]
        current_version: String,
    },
    #[serde(rename = "download-started")]
    DownloadStarted,
    Progress {
        percent: f64,
        transferred: u64,
        total: u64,
        #[serde(rename = "bytesPerSecond")]
        bytes_per_second: f64,
    },
    Downloaded {
        version: String,
        #[serde(rename = "releaseNotes")]
        release_notes: String,
    },
    Error {
        phase: String,
        message: String,
    },
    #[serde(rename = "github-status")]
    GithubStatus {
        reachable: bool,
        indicator: String,
        description: String,
        #[serde(rename = "descriptionRu")]
        description_ru: String,
    },
}

fn emit(app: &AppHandle, event: UpdateEvent) {
    let _ = app.emit("updater:event", event);
}

fn parse_version(v: &str) -> Option<(u64, u64, u64)> {
    let clean = v.trim().trim_start_matches('v');
    let mut parts = clean.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = parts
        .next()
        .unwrap_or("0")
        .split(|c: char| !c.is_ascii_digit())
        .next()
        .unwrap_or("0")
        .parse()
        .ok()?;
    Some((major, minor, patch))
}

fn is_newer(remote: &str, local: &str) -> bool {
    match (parse_version(remote), parse_version(local)) {
        (Some(r), Some(l)) => r > l,
        _ => remote.trim_start_matches('v') != local.trim_start_matches('v'),
    }
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(std::time::Duration::from_secs(60))
        .redirect(reqwest::redirect::Policy::limited(10))
        // HTTP/2 + нестандартные заголовки иногда дают 400 на CDN релизов GitHub.
        .http1_only()
        .build()
        .map_err(|e| e.to_string())
}

/// Разбор electron-builder `latest.yml` (version + path/url установщика).
fn parse_latest_yml(text: &str) -> Result<(String, String), String> {
    let mut version: Option<String> = None;
    let mut file_name: Option<String> = None;

    for raw in text.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some(rest) = line.strip_prefix("version:") {
            version = Some(
                rest.trim()
                    .trim_matches(|c| c == '\'' || c == '"')
                    .to_string(),
            );
            continue;
        }
        if let Some(rest) = line.strip_prefix("path:") {
            file_name = Some(
                rest.trim()
                    .trim_matches(|c| c == '\'' || c == '"')
                    .to_string(),
            );
            continue;
        }
        // files: - url: name.exe
        if let Some(rest) = line.strip_prefix("- url:") {
            if file_name.is_none() {
                file_name = Some(
                    rest.trim()
                        .trim_matches(|c| c == '\'' || c == '"')
                        .to_string(),
                );
            }
            continue;
        }
        if let Some(rest) = line.strip_prefix("url:") {
            if file_name.is_none() {
                file_name = Some(
                    rest.trim()
                        .trim_matches(|c| c == '\'' || c == '"')
                        .to_string(),
                );
            }
        }
    }

    let version = version.filter(|v| !v.is_empty()).ok_or_else(|| {
        "В latest.yml нет номера версии. Проверьте файлы релиза на GitHub.".to_string()
    })?;
    let file_name = file_name.filter(|v| !v.is_empty()).ok_or_else(|| {
        "В latest.yml нет имени установщика (path/url).".to_string()
    })?;

    Ok((version.trim_start_matches('v').to_string(), file_name))
}

/// Достаёт тег из первого `<entry>` ленты releases.atom (`.../v1.4.2`).
fn parse_releases_atom_version(atom: &str) -> Option<String> {
    let entry = atom.split("<entry>").nth(1)?;
    // <id>tag:github.com,2008:Repository/…/v1.4.2</id>
    if let Some(id_rest) = entry.split("<id>").nth(1) {
        let id = id_rest.split("</id>").next()?.trim();
        if let Some(tag) = id.rsplit('/').next() {
            let ver = tag.trim().trim_start_matches('v');
            if parse_version(ver).is_some() {
                return Some(ver.to_string());
            }
        }
    }
    // <link … href="https://github.com/…/releases/tag/v1.4.2"/>
    if let Some(href_idx) = entry.find("/releases/tag/") {
        let after = &entry[href_idx + "/releases/tag/".len()..];
        let tag: String = after
            .chars()
            .take_while(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
            .collect();
        let ver = tag.trim().trim_start_matches('v');
        if parse_version(ver).is_some() {
            return Some(ver.to_string());
        }
    }
    None
}

async fn push_github_status(app: &AppHandle) {
    let client = match http_client() {
        Ok(c) => c,
        Err(_) => return,
    };
    match client.get(GH_STATUS).send().await {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.unwrap_or_default();
            let indicator = body
                .pointer("/status/indicator")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
                .to_string();
            let description = body
                .pointer("/status/description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let description_ru = match indicator.as_str() {
                "none" => "GitHub: всё работает".to_string(),
                "minor" => "GitHub: незначительные проблемы".to_string(),
                "major" => "GitHub: серьёзные проблемы".to_string(),
                "critical" => "GitHub: критический сбой".to_string(),
                _ => format!("GitHub: {description}"),
            };
            emit(
                app,
                UpdateEvent::GithubStatus {
                    reachable: true,
                    indicator,
                    description,
                    description_ru,
                },
            );
        }
        _ => {
            emit(
                app,
                UpdateEvent::GithubStatus {
                    reachable: false,
                    indicator: "unknown".into(),
                    description: "Unable to reach GitHub Status".into(),
                    description_ru: "Не удалось получить статус GitHub".into(),
                },
            );
        }
    }
}

async fn fetch_text(client: &reqwest::Client, url: &str) -> Result<(reqwest::StatusCode, String), String> {
    let response = client
        .get(url)
        .header("Accept", "*/*")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;
    Ok((status, text))
}

async fn fetch_latest_yml(client: &reqwest::Client) -> Result<(String, String), String> {
    let mut last_err = String::new();
    // Две попытки: intermittent 400 на CDN релизов GitHub.
    for attempt in 1..=2 {
        match fetch_text(client, LATEST_YML).await {
            Ok((status, text)) if status.is_success() => {
                return parse_latest_yml(&text);
            }
            Ok((status, text)) => {
                let snippet: String = text.chars().take(120).collect();
                last_err = format!(
                    "Не удалось получить latest.yml (HTTP {status}). Попытка {attempt}/2. {snippet}"
                );
            }
            Err(e) => {
                last_err = format!("Не удалось скачать latest.yml с GitHub (попытка {attempt}/2): {e}");
            }
        }
        if attempt == 1 {
            tokio::time::sleep(std::time::Duration::from_millis(400)).await;
        }
    }
    Err(last_err)
}

async fn fetch_atom_version(client: &reqwest::Client) -> Result<String, String> {
    let (status, text) = fetch_text(client, RELEASES_ATOM).await?;
    if !status.is_success() {
        return Err(format!(
            "Не удалось получить список релизов (HTTP {status})."
        ));
    }
    parse_releases_atom_version(&text).ok_or_else(|| {
        "Не удалось разобрать номер версии из ленты релизов GitHub.".to_string()
    })
}

fn installer_url(version: &str, file_name: Option<&str>) -> String {
    if let Some(name) = file_name {
        if name.starts_with("http://") || name.starts_with("https://") {
            return name.to_string();
        }
        // Предпочитаем URL с явным тегом — стабильнее, чем /latest/download на CDN.
        return format!("{DOWNLOAD_TAG_BASE}/v{version}/{name}");
    }
    format!("{DOWNLOAD_TAG_BASE}/v{version}/eva-style-setup-{version}.exe")
}

pub async fn run_check(app: AppHandle, current_version: String, manual: bool) {
    if manual {
        emit(
            &app,
            UpdateEvent::Checking {
                current_version: current_version.clone(),
            },
        );
        push_github_status(&app).await;
    }

    let client = match http_client() {
        Ok(c) => c,
        Err(message) => {
            emit(
                &app,
                UpdateEvent::Error {
                    phase: "check".into(),
                    message,
                },
            );
            return;
        }
    };

    let remote = match fetch_latest_yml(&client).await {
        Ok(v) => Ok(v),
        Err(yml_err) => {
            // Запасной канал: atom-лента. Если версии нет новее — не пугаем ошибкой CDN.
            match fetch_atom_version(&client).await {
                Ok(tag) => {
                    if !is_newer(&tag, &current_version) {
                        if manual {
                            emit(
                                &app,
                                UpdateEvent::NotAvailable {
                                    current_version: current_version.clone(),
                                },
                            );
                        }
                        return;
                    }
                    let file_name = format!("eva-style-setup-{tag}.exe");
                    Ok((tag, file_name))
                }
                Err(atom_err) => Err(format!(
                    "{yml_err}\nЗапасная проверка тоже не удалась: {atom_err}\nПроверьте, что релиз опубликован."
                )),
            }
        }
    };

    let (tag, file_name) = match remote {
        Ok(v) => v,
        Err(message) => {
            emit(
                &app,
                UpdateEvent::Error {
                    phase: "check".into(),
                    message,
                },
            );
            return;
        }
    };

    if !is_newer(&tag, &current_version) {
        if manual {
            emit(
                &app,
                UpdateEvent::NotAvailable {
                    current_version: current_version.clone(),
                },
            );
        }
        return;
    }

    let url = installer_url(&tag, Some(&file_name));
    let notes = format!("Доступна версия {tag}. После загрузки запустится установщик.");

    if let Some(state) = app.try_state::<PendingUpdateState>() {
        if let Ok(mut guard) = state.lock() {
            *guard = Some(PendingUpdate {
                version: tag.clone(),
                notes: notes.clone(),
                url,
                installer: None,
            });
        }
    }

    emit(
        &app,
        UpdateEvent::Available {
            version: tag,
            current_version,
            release_notes: notes,
            manual,
        },
    );
}

pub async fn run_download(app: AppHandle) {
    let pending = {
        let state = match app.try_state::<PendingUpdateState>() {
            Some(s) => s,
            None => {
                emit(
                    &app,
                    UpdateEvent::Error {
                        phase: "download".into(),
                        message: "Нет данных об обновлении. Сначала выполните проверку.".into(),
                    },
                );
                return;
            }
        };
        let guard = match state.lock() {
            Ok(g) => g,
            Err(_) => {
                emit(
                    &app,
                    UpdateEvent::Error {
                        phase: "download".into(),
                        message: "Состояние обновления занято.".into(),
                    },
                );
                return;
            }
        };
        match guard.as_ref() {
            Some(p) => (p.version.clone(), p.notes.clone(), p.url.clone()),
            None => {
                emit(
                    &app,
                    UpdateEvent::Error {
                        phase: "download".into(),
                        message: "Нет данных об обновлении. Сначала выполните проверку.".into(),
                    },
                );
                return;
            }
        }
    };

    let (version, notes, url) = pending;
    emit(&app, UpdateEvent::DownloadStarted);

    let client = match http_client() {
        Ok(c) => c,
        Err(message) => {
            emit(
                &app,
                UpdateEvent::Error {
                    phase: "download".into(),
                    message,
                },
            );
            return;
        }
    };

    let response = match client
        .get(&url)
        .header("Accept", "application/octet-stream")
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            // Fallback на /latest/download/…
            let fallback = format!("{DOWNLOAD_BASE}/eva-style-setup-{version}.exe");
            match client
                .get(&fallback)
                .header("Accept", "application/octet-stream")
                .send()
                .await
            {
                Ok(r) => r,
                Err(_) => {
                    emit(
                        &app,
                        UpdateEvent::Error {
                            phase: "download".into(),
                            message: format!("Не удалось начать загрузку: {e}"),
                        },
                    );
                    return;
                }
            }
        }
    };

    if !response.status().is_success() {
        emit(
            &app,
            UpdateEvent::Error {
                phase: "download".into(),
                message: format!("Ошибка загрузки установщика (HTTP {}).", response.status()),
            },
        );
        return;
    }

    let total = response.content_length().unwrap_or(0);
    let mut stream = response.bytes_stream();
    let tmp_dir = std::env::temp_dir().join("eva-style-update");
    if let Err(e) = std::fs::create_dir_all(&tmp_dir) {
        emit(
            &app,
            UpdateEvent::Error {
                phase: "download".into(),
                message: e.to_string(),
            },
        );
        return;
    }
    let file_path = tmp_dir.join(format!("eva-style-setup-{version}.exe"));
    let mut file = match File::create(&file_path) {
        Ok(f) => f,
        Err(e) => {
            emit(
                &app,
                UpdateEvent::Error {
                    phase: "download".into(),
                    message: e.to_string(),
                },
            );
            return;
        }
    };

    let mut transferred: u64 = 0;
    let started = Instant::now();
    let mut last_emit = Instant::now();

    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => {
                emit(
                    &app,
                    UpdateEvent::Error {
                        phase: "download".into(),
                        message: format!("Сбой загрузки: {e}"),
                    },
                );
                return;
            }
        };
        if let Err(e) = file.write_all(&chunk) {
            emit(
                &app,
                UpdateEvent::Error {
                    phase: "download".into(),
                    message: e.to_string(),
                },
            );
            return;
        }
        transferred += chunk.len() as u64;
        if last_emit.elapsed().as_millis() >= 200 || transferred == total {
            let elapsed = started.elapsed().as_secs_f64().max(0.001);
            let percent = if total > 0 {
                (transferred as f64 / total as f64) * 100.0
            } else {
                0.0
            };
            emit(
                &app,
                UpdateEvent::Progress {
                    percent,
                    transferred,
                    total,
                    bytes_per_second: transferred as f64 / elapsed,
                },
            );
            last_emit = Instant::now();
        }
    }

    if let Some(state) = app.try_state::<PendingUpdateState>() {
        if let Ok(mut guard) = state.lock() {
            if let Some(pending) = guard.as_mut() {
                pending.installer = Some(file_path.clone());
            }
        }
    }

    emit(
        &app,
        UpdateEvent::Downloaded {
            version,
            release_notes: notes,
        },
    );
}

pub fn run_install(app: AppHandle) -> Result<(), String> {
    let installer = {
        let state = app
            .try_state::<PendingUpdateState>()
            .ok_or_else(|| "Нет данных об обновлении".to_string())?;
        let guard = state
            .lock()
            .map_err(|_| "Состояние обновления занято".to_string())?;
        guard
            .as_ref()
            .and_then(|p| p.installer.clone())
            .ok_or_else(|| "Установщик ещё не загружен".to_string())?
    };

    if !installer.is_file() {
        return Err(format!("Файл установщика не найден: {}", installer.display()));
    }

    std::process::Command::new(&installer)
        .spawn()
        .map_err(|e| format!("Не удалось запустить установщик: {e}"))?;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.close();
    }
    app.exit(0);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_latest_yml() {
        let yml = r#"version: 1.4.2
files:
  - url: eva-style-setup-1.4.2.exe
    sha512: abc
    size: 1
path: eva-style-setup-1.4.2.exe
"#;
        let (v, f) = parse_latest_yml(yml).unwrap();
        assert_eq!(v, "1.4.2");
        assert_eq!(f, "eva-style-setup-1.4.2.exe");
    }

    #[test]
    fn parses_atom_version() {
        let atom = r#"<?xml version="1.0"?>
<feed>
  <entry>
    <id>tag:github.com,2008:Repository/1296340090/v1.4.2</id>
    <link rel="alternate" href="https://github.com/nickeynnick/Eva-style/releases/tag/v1.4.2"/>
    <title>Ева-стиль 1.4.2</title>
  </entry>
</feed>"#;
        assert_eq!(parse_releases_atom_version(atom).as_deref(), Some("1.4.2"));
    }

    #[test]
    fn version_compare() {
        assert!(is_newer("1.4.3", "1.4.2"));
        assert!(!is_newer("1.4.2", "1.4.2"));
        assert!(!is_newer("1.4.1", "1.4.2"));
    }
}
