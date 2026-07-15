#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod data_store;
mod paths;
mod updater;

use data_store::{DataStore, DataStoreInfo, StoreLoadResult, StoreSaveResult};
use paths::{auto_save_backup, detect_portable, get_crash_logs_dir, write_crash_log, PathResult};
use serde::Deserialize;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State, WebviewWindow};
use tauri_plugin_dialog::{DialogExt, FilePath};
use updater::PendingUpdateState;

struct AppState {
    store: Mutex<Option<DataStore>>,
    exe_dir: PathBuf,
    portable: bool,
    version: String,
    packaged: bool,
}

fn with_store<F, T>(state: &AppState, f: F) -> Result<T, String>
where
    F: FnOnce(&DataStore) -> T,
{
    let guard = state
        .store
        .lock()
        .map_err(|_| "Хранилище занято".to_string())?;
    let store = guard
        .as_ref()
        .ok_or_else(|| "Хранилище SQLite ещё не инициализировано".to_string())?;
    Ok(f(store))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoreSavePayload {
    json: String,
    #[serde(default = "default_schema_version")]
    schema_version: i64,
}

fn default_schema_version() -> i64 {
    1
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupPayload {
    file_name: String,
    content: String,
    #[serde(default = "default_keep_last")]
    keep_last: usize,
}

fn default_keep_last() -> usize {
    10
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CrashPayload {
    #[serde(default = "default_crash_kind")]
    kind: String,
    #[serde(default)]
    message: String,
    stack: Option<String>,
    extra: Option<serde_json::Value>,
}

fn default_crash_kind() -> String {
    "crash".into()
}

#[tauri::command]
fn get_desktop_meta(state: State<'_, AppState>) -> serde_json::Value {
    serde_json::json!({
        "platform": std::env::consts::OS,
        "isDesktop": true,
        "version": state.version,
        "isPortable": state.portable,
    })
}

#[tauri::command]
fn store_load(state: State<'_, AppState>) -> StoreLoadResult {
    match with_store(&state, |store| store.load()) {
        Ok(result) => result,
        Err(error) => StoreLoadResult {
            success: false,
            payload: None,
            updated_at: None,
            schema_version: None,
            error: Some(error),
            info: DataStoreInfo {
                ready: false,
                path: None,
                dir: None,
                updated_at: None,
                schema_version: None,
                has_payload: false,
                payload_chars: 0,
                file_bytes: 0,
            },
        },
    }
}

#[tauri::command]
fn store_save(state: State<'_, AppState>, payload: StoreSavePayload) -> StoreSaveResult {
    match with_store(&state, |store| store.save(&payload.json, payload.schema_version)) {
        Ok(result) => result,
        Err(error) => StoreSaveResult {
            success: false,
            path: None,
            updated_at: None,
            error: Some(error),
            info: DataStoreInfo {
                ready: false,
                path: None,
                dir: None,
                updated_at: None,
                schema_version: None,
                has_payload: false,
                payload_chars: 0,
                file_bytes: 0,
            },
        },
    }
}

#[tauri::command]
fn get_data_store_info(state: State<'_, AppState>) -> serde_json::Value {
    match with_store(&state, |store| store.info()) {
        Ok(info) => {
            let mut value = serde_json::to_value(info).unwrap_or_default();
            if let Some(obj) = value.as_object_mut() {
                obj.insert("success".into(), serde_json::Value::Bool(true));
            }
            value
        }
        Err(error) => serde_json::json!({ "success": false, "error": error }),
    }
}

#[tauri::command]
async fn open_data_store_folder(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<PathResult, String> {
    let dir = with_store(&state, |store| store.data_dir().to_path_buf())?;
    fs_create_dir(&dir)?;
    open_path(&app, &dir)?;
    Ok(PathResult {
        success: true,
        path: Some(dir.to_string_lossy().into_owned()),
        dir: None,
        error: None,
        pruned: None,
        keep_last: None,
    })
}

#[tauri::command]
async fn save_backup(
    app: AppHandle,
    window: WebviewWindow,
    payload: BackupPayload,
) -> Result<PathResult, String> {
    let documents = dirs::document_dir().unwrap_or_else(|| PathBuf::from("."));
    let default_path = documents.join(&payload.file_name);

    let file = app
        .dialog()
        .file()
        .set_title("Сохранить резервную копию")
        .set_file_name(
            default_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("backup.json"),
        )
        .add_filter("JSON", &["json"])
        .set_parent(&window)
        .blocking_save_file();

    let _ = window.set_focus();

    match file {
        Some(FilePath::Path(path)) => {
            std::fs::write(&path, &payload.content).map_err(|e| e.to_string())?;
            Ok(PathResult {
                success: true,
                path: Some(path.to_string_lossy().into_owned()),
                dir: None,
                error: None,
                pruned: None,
                keep_last: None,
            })
        }
        Some(_) => Ok(PathResult {
            success: false,
            path: None,
            dir: None,
            error: Some("Неподдерживаемый путь".into()),
            pruned: None,
            keep_last: None,
        }),
        None => Ok(PathResult {
            success: false,
            path: None,
            dir: None,
            error: None,
            pruned: None,
            keep_last: None,
        }),
    }
}

#[tauri::command]
fn auto_save_backup_cmd(payload: BackupPayload) -> PathResult {
    auto_save_backup(&payload.file_name, &payload.content, payload.keep_last)
}

#[tauri::command]
async fn check_for_updates(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if cfg!(debug_assertions) {
        return Ok(serde_json::json!({ "status": "dev" }));
    }
    if state.portable {
        return Ok(serde_json::json!({ "status": "portable" }));
    }

    let version = state.version.clone();
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        updater::run_check(handle, version, true).await;
    });
    Ok(serde_json::json!({ "status": "checking" }))
}

#[tauri::command]
async fn download_update(app: AppHandle) -> Result<serde_json::Value, String> {
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        updater::run_download(handle).await;
    });
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
fn install_update(app: AppHandle) -> Result<serde_json::Value, String> {
    updater::run_install(app)?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
fn focus_window(window: WebviewWindow) -> serde_json::Value {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    serde_json::json!({ "success": true })
}

#[tauri::command]
fn write_crash_log_cmd(state: State<'_, AppState>, payload: CrashPayload) -> PathResult {
    let extra = payload
        .extra
        .as_ref()
        .map(|v| serde_json::to_string_pretty(v).unwrap_or_else(|_| v.to_string()));
    write_crash_log(
        &state.exe_dir,
        state.portable,
        &state.version,
        state.packaged,
        &payload.kind,
        &payload.message,
        payload.stack.as_deref(),
        extra.as_deref(),
    )
}

#[tauri::command]
async fn open_crash_logs(app: AppHandle, state: State<'_, AppState>) -> Result<PathResult, String> {
    let dir = get_crash_logs_dir(&state.exe_dir, state.portable)?;
    open_path(&app, &dir)?;
    Ok(PathResult {
        success: true,
        path: Some(dir.to_string_lossy().into_owned()),
        dir: None,
        error: None,
        pruned: None,
        keep_last: None,
    })
}

#[tauri::command]
fn get_crash_logs_path(state: State<'_, AppState>) -> PathResult {
    match get_crash_logs_dir(&state.exe_dir, state.portable) {
        Ok(dir) => PathResult {
            success: true,
            path: Some(dir.to_string_lossy().into_owned()),
            dir: None,
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

fn fs_create_dir(dir: &std::path::Path) -> Result<(), String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())
}

fn open_path(app: &AppHandle, path: &std::path::Path) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_path(path.to_string_lossy().as_ref(), None::<&str>)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|d| d.to_path_buf()))
                .unwrap_or_else(|| PathBuf::from("."));
            let portable = detect_portable(&exe_dir);
            let packaged = !cfg!(debug_assertions);
            let version = app.package_info().version.to_string();

            let data_dir = data_store::resolve_data_dir(portable, &exe_dir)
                .map_err(|e| e.to_string())?;
            let store = DataStore::open(data_dir).map_err(|e| e.to_string())?;

            app.manage(AppState {
                store: Mutex::new(Some(store)),
                exe_dir: exe_dir.clone(),
                portable,
                version: version.clone(),
                packaged,
            });
            app.manage::<PendingUpdateState>(Mutex::new(None));

            if packaged && !portable {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(Duration::from_secs(4)).await;
                    updater::run_check(handle, version, false).await;
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_desktop_meta,
            store_load,
            store_save,
            get_data_store_info,
            open_data_store_folder,
            save_backup,
            auto_save_backup_cmd,
            check_for_updates,
            download_update,
            install_update,
            focus_window,
            write_crash_log_cmd,
            open_crash_logs,
            get_crash_logs_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
