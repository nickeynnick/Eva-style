//! Пути CrashLogs, бэкапов и определение portable-режима.

use chrono::Utc;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PathResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dir: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pruned: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keep_last: Option<usize>,
}

fn ensure_writable_dir(dir: &Path) -> Result<PathBuf, String> {
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let probe = dir.join(".write-test");
    fs::write(&probe, b"ok").map_err(|e| e.to_string())?;
    let _ = fs::remove_file(&probe);
    Ok(dir.to_path_buf())
}

/// Portable: рядом с exe есть файл `portable` или папка `Data`, либо env EVA_STYLE_PORTABLE=1.
pub fn detect_portable(exe_dir: &Path) -> bool {
    if std::env::var("EVA_STYLE_PORTABLE").ok().as_deref() == Some("1") {
        return true;
    }
    if std::env::var("PORTABLE_EXECUTABLE_DIR").is_ok() {
        return true;
    }
    exe_dir.join("portable").is_file() || exe_dir.join("Data").is_dir()
}

pub fn get_crash_logs_dir(exe_dir: &Path, portable: bool) -> Result<PathBuf, String> {
    let primary = if portable {
        exe_dir.join("CrashLogs")
    } else {
        exe_dir.join("CrashLogs")
    };

    match ensure_writable_dir(&primary) {
        Ok(dir) => Ok(dir),
        Err(_) => {
            let fallback = dirs::document_dir()
                .unwrap_or_else(|| exe_dir.to_path_buf())
                .join("Ева-стиль")
                .join("CrashLogs");
            ensure_writable_dir(&fallback)
        }
    }
}

pub fn write_crash_log(
    exe_dir: &Path,
    portable: bool,
    version: &str,
    packaged: bool,
    kind: &str,
    message: &str,
    stack: Option<&str>,
    extra: Option<&str>,
) -> PathResult {
    match (|| -> Result<(PathBuf, PathBuf), String> {
        let dir = get_crash_logs_dir(exe_dir, portable)?;
        let stamp = Utc::now().format("%Y-%m-%dT%H-%M-%S%.3fZ").to_string();
        let safe_kind: String = kind
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' {
                    c
                } else {
                    '_'
                }
            })
            .take(40)
            .collect();
        let file_path = dir.join(format!("crash_{stamp}_{safe_kind}.txt"));
        let mut lines = vec![
            "Ева-стиль crash log".to_string(),
            format!("version: {version}"),
            format!("when: {}", Utc::now().to_rfc3339()),
            format!("kind: {kind}"),
            format!("platform: {}", std::env::consts::OS),
            format!("packaged: {packaged}"),
            format!("portable: {portable}"),
            format!("dir: {}", dir.display()),
            String::new(),
            message.to_string(),
        ];
        if let Some(stack) = stack {
            lines.push(String::new());
            lines.push(stack.to_string());
        }
        if let Some(extra) = extra {
            lines.push(String::new());
            lines.push(extra.to_string());
        }
        fs::write(&file_path, lines.join("\n")).map_err(|e| e.to_string())?;
        Ok((file_path, dir))
    })() {
        Ok((file_path, dir)) => PathResult {
            success: true,
            path: Some(file_path.to_string_lossy().into_owned()),
            dir: Some(dir.to_string_lossy().into_owned()),
            error: None,
            pruned: None,
            keep_last: None,
        },
        Err(error) => PathResult {
            success: false,
            path: None,
            dir: None,
            error: Some(error),
            pruned: None,
            keep_last: None,
        },
    }
}

pub fn backups_dir() -> Result<PathBuf, String> {
    let dir = dirs::document_dir()
        .ok_or_else(|| "Не удалось определить папку Документы".to_string())?
        .join("Ева-стиль")
        .join("Backups");
    ensure_writable_dir(&dir)
}

pub fn auto_save_backup(file_name: &str, content: &str, keep_last: usize) -> PathResult {
    match (|| -> Result<(PathBuf, usize, usize), String> {
        let dir = backups_dir()?;
        let file_path = dir.join(file_name);
        fs::write(&file_path, content).map_err(|e| e.to_string())?;

        let keep = keep_last.max(1);
        let mut auto_files: Vec<(PathBuf, std::time::SystemTime)> = fs::read_dir(&dir)
            .map_err(|e| e.to_string())?
            .filter_map(|entry| entry.ok())
            .filter(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .to_ascii_lowercase()
                    .starts_with("eva_style_auto_")
                    && entry
                        .path()
                        .extension()
                        .is_some_and(|ext| ext.eq_ignore_ascii_case("json"))
            })
            .filter_map(|entry| {
                let meta = entry.metadata().ok()?;
                let mtime = meta.modified().ok()?;
                Some((entry.path(), mtime))
            })
            .collect();

        auto_files.sort_by(|a, b| b.1.cmp(&a.1));
        let mut pruned = 0usize;
        for (path, _) in auto_files.into_iter().skip(keep) {
            if fs::remove_file(path).is_ok() {
                pruned += 1;
            }
        }

        Ok((file_path, pruned, keep))
    })() {
        Ok((path, pruned, keep)) => PathResult {
            success: true,
            path: Some(path.to_string_lossy().into_owned()),
            dir: None,
            error: None,
            pruned: Some(pruned),
            keep_last: Some(keep),
        },
        Err(error) => PathResult {
            success: false,
            path: None,
            dir: None,
            error: Some(error),
            pruned: None,
            keep_last: None,
        },
    }
}
