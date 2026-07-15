//! SQLite-хранилище журнала (Documents/Ева-стиль/Data/eva_style_store.sqlite).

use chrono::Utc;
use rusqlite::{params, Connection};
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DataStoreError {
    #[error("{0}")]
    Message(String),
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
}

pub type DataStoreResult<T> = Result<T, DataStoreError>;

pub struct DataStore {
    conn: Mutex<Connection>,
    db_path: PathBuf,
    data_dir: PathBuf,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoreLoadResult {
    pub success: bool,
    pub payload: Option<String>,
    pub updated_at: Option<String>,
    pub schema_version: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub info: DataStoreInfo,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoreSaveResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub info: DataStoreInfo,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DataStoreInfo {
    pub ready: bool,
    pub path: Option<String>,
    pub dir: Option<String>,
    pub updated_at: Option<String>,
    pub schema_version: Option<i64>,
    pub has_payload: bool,
    pub payload_chars: usize,
    pub file_bytes: i64,
}

fn ensure_writable_dir(dir: &Path) -> DataStoreResult<PathBuf> {
    fs::create_dir_all(dir)?;
    let probe = dir.join(".write-test");
    fs::write(&probe, b"ok")?;
    let _ = fs::remove_file(&probe);
    Ok(dir.to_path_buf())
}

/// Папка данных: Documents/Ева-стиль/Data; portable — рядом с exe; fallback — local data.
pub fn resolve_data_dir(portable: bool, resource_dir: &Path) -> DataStoreResult<PathBuf> {
    if portable {
        return ensure_writable_dir(&resource_dir.join("Data"));
    }

    if let Some(documents) = dirs::document_dir() {
        let preferred = documents.join("Ева-стиль").join("Data");
        if let Ok(dir) = ensure_writable_dir(&preferred) {
            return Ok(dir);
        }
    }

    let fallback = dirs::data_local_dir()
        .unwrap_or_else(|| resource_dir.join("data"))
        .join("Ева-стиль")
        .join("Data");
    ensure_writable_dir(&fallback)
}

fn ensure_schema(conn: &Connection) -> DataStoreResult<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS app_store (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          schema_version INTEGER NOT NULL DEFAULT 1,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        "#,
    )?;
    Ok(())
}

impl DataStore {
    pub fn open(data_dir: PathBuf) -> DataStoreResult<Self> {
        let db_path = data_dir.join("eva_style_store.sqlite");
        let conn = Connection::open(&db_path)?;
        ensure_schema(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
            db_path,
            data_dir,
        })
    }

    pub fn info(&self) -> DataStoreInfo {
        let loaded = self.load_inner().unwrap_or((None, None, None));
        let file_bytes = fs::metadata(&self.db_path)
            .map(|m| m.len() as i64)
            .unwrap_or(-1);

        DataStoreInfo {
            ready: true,
            path: Some(self.db_path.to_string_lossy().into_owned()),
            dir: Some(self.data_dir.to_string_lossy().into_owned()),
            updated_at: loaded.1,
            schema_version: loaded.2,
            has_payload: loaded.0.as_ref().is_some_and(|p| !p.is_empty()),
            payload_chars: loaded.0.as_ref().map(|p| p.len()).unwrap_or(0),
            file_bytes,
        }
    }

    fn load_inner(&self) -> DataStoreResult<(Option<String>, Option<String>, Option<i64>)> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| DataStoreError::Message("Хранилище занято".into()))?;

        let mut stmt = conn.prepare(
            "SELECT payload, updated_at, schema_version FROM app_store WHERE id = 1 LIMIT 1",
        )?;

        let mut rows = stmt.query([])?;
        if let Some(row) = rows.next()? {
            let payload: String = row.get(0)?;
            let updated_at: String = row.get(1)?;
            let schema_version: i64 = row.get(2)?;
            Ok((Some(payload), Some(updated_at), Some(schema_version)))
        } else {
            Ok((None, None, None))
        }
    }

    pub fn load(&self) -> StoreLoadResult {
        match self.load_inner() {
            Ok((payload, updated_at, schema_version)) => StoreLoadResult {
                success: true,
                payload,
                updated_at,
                schema_version,
                error: None,
                info: self.info(),
            },
            Err(error) => StoreLoadResult {
                success: false,
                payload: None,
                updated_at: None,
                schema_version: None,
                error: Some(error.to_string()),
                info: self.info(),
            },
        }
    }

    pub fn save(&self, payload_json: &str, schema_version: i64) -> StoreSaveResult {
        match self.save_inner(payload_json, schema_version) {
            Ok(updated_at) => StoreSaveResult {
                success: true,
                path: Some(self.db_path.to_string_lossy().into_owned()),
                updated_at: Some(updated_at),
                error: None,
                info: self.info(),
            },
            Err(error) => StoreSaveResult {
                success: false,
                path: None,
                updated_at: None,
                error: Some(error.to_string()),
                info: self.info(),
            },
        }
    }

    fn save_inner(&self, payload_json: &str, schema_version: i64) -> DataStoreResult<String> {
        if payload_json.is_empty() {
            return Err(DataStoreError::Message("Пустой payload для сохранения".into()));
        }

        let parsed: Value = serde_json::from_str(payload_json)?;
        if !parsed.is_object() || !parsed.get("visits").map(|v| v.is_array()).unwrap_or(false) {
            return Err(DataStoreError::Message(
                "Некорректная структура store (нет visits)".into(),
            ));
        }

        let updated_at = Utc::now().to_rfc3339();
        let conn = self
            .conn
            .lock()
            .map_err(|_| DataStoreError::Message("Хранилище занято".into()))?;

        conn.execute("DELETE FROM app_store WHERE id = 1", [])?;
        conn.execute(
            "INSERT INTO app_store (id, schema_version, payload, updated_at) VALUES (1, ?1, ?2, ?3)",
            params![schema_version, payload_json, updated_at],
        )?;

        Ok(updated_at)
    }

    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }
}
