const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

/** @type {import("sql.js").SqlJsStatic | null} */
let SQL = null;
/** @type {import("sql.js").Database | null} */
let db = null;
let dbPath = null;
let dataDir = null;
let ready = false;

function ensureWritableDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const probe = path.join(dir, ".write-test");
  fs.writeFileSync(probe, "ok", "utf-8");
  fs.unlinkSync(probe);
  return dir;
}

/**
 * Папка данных: Documents/Ева-стиль/Data (рядом с Backups),
 * portable — Data рядом с exe, иначе userData/Data.
 */
function resolveDataDir(app) {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return ensureWritableDir(path.join(process.env.PORTABLE_EXECUTABLE_DIR, "Data"));
  }
  const preferred = path.join(app.getPath("documents"), "Ева-стиль", "Data");
  try {
    return ensureWritableDir(preferred);
  } catch {
    return ensureWritableDir(path.join(app.getPath("userData"), "Data"));
  }
}

function resolveWasmBinary() {
  const candidates = [
    path.join(__dirname, "../node_modules/sql.js/dist/sql-wasm.wasm"),
    (() => {
      try {
        return require.resolve("sql.js/dist/sql-wasm.wasm");
      } catch {
        return null;
      }
    })(),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate);
    }
  }
  throw new Error("Не найден sql-wasm.wasm (пакет sql.js)");
}

function flushDbToDisk() {
  if (!db || !dbPath) return;
  const exported = db.export();
  const buffer = Buffer.from(exported);
  const tmpPath = `${dbPath}.tmp`;
  const bakPath = `${dbPath}.bak`;

  fs.writeFileSync(tmpPath, buffer);
  if (fs.existsSync(dbPath)) {
    try {
      fs.copyFileSync(dbPath, bakPath);
    } catch {
      // bak best-effort
    }
  }
  fs.renameSync(tmpPath, dbPath);
}

function ensureSchema() {
  if (!db) return;
  db.run(`
    CREATE TABLE IF NOT EXISTS app_store (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      schema_version INTEGER NOT NULL DEFAULT 1,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

/**
 * @param {import("electron").App} app
 */
async function initDataStore(app) {
  if (ready) return { success: true, path: dbPath, dir: dataDir };

  dataDir = resolveDataDir(app);
  dbPath = path.join(dataDir, "eva_style_store.sqlite");

  const wasmBinary = resolveWasmBinary();
  SQL = await initSqlJs({ wasmBinary });

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  ensureSchema();
  flushDbToDisk();
  ready = true;
  return { success: true, path: dbPath, dir: dataDir };
}

function assertReady() {
  if (!ready || !db) {
    throw new Error("Хранилище SQLite ещё не инициализировано");
  }
}

/** @returns {{ payload: string | null, updatedAt: string | null, schemaVersion: number | null }} */
function loadStorePayload() {
  assertReady();
  const result = db.exec("SELECT payload, updated_at, schema_version FROM app_store WHERE id = 1 LIMIT 1");
  if (!result.length || !result[0].values.length) {
    return { payload: null, updatedAt: null, schemaVersion: null };
  }
  const [payload, updatedAt, schemaVersion] = result[0].values[0];
  return {
    payload: typeof payload === "string" ? payload : null,
    updatedAt: typeof updatedAt === "string" ? updatedAt : null,
    schemaVersion: typeof schemaVersion === "number" ? schemaVersion : Number(schemaVersion) || null,
  };
}

/**
 * @param {string} payloadJson
 * @param {number} [schemaVersion]
 */
function saveStorePayload(payloadJson, schemaVersion = 1) {
  assertReady();
  if (typeof payloadJson !== "string" || !payloadJson) {
    throw new Error("Пустой payload для сохранения");
  }
  // Quick sanity: must be JSON object
  const parsed = JSON.parse(payloadJson);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.visits)) {
    throw new Error("Некорректная структура store (нет visits)");
  }

  const updatedAt = new Date().toISOString();
  db.run("DELETE FROM app_store WHERE id = 1");
  db.run(
    "INSERT INTO app_store (id, schema_version, payload, updated_at) VALUES (1, ?, ?, ?)",
    [Number(schemaVersion) || 1, payloadJson, updatedAt]
  );
  flushDbToDisk();
  return { success: true, path: dbPath, updatedAt };
}

function getDataStoreInfo() {
  const loaded = ready ? loadStorePayload() : { payload: null, updatedAt: null, schemaVersion: null };
  let fileBytes = 0;
  try {
    if (dbPath && fs.existsSync(dbPath)) fileBytes = fs.statSync(dbPath).size;
  } catch {
    fileBytes = -1;
  }
  return {
    ready,
    path: dbPath,
    dir: dataDir,
    updatedAt: loaded.updatedAt,
    schemaVersion: loaded.schemaVersion,
    hasPayload: Boolean(loaded.payload),
    payloadChars: loaded.payload ? loaded.payload.length : 0,
    fileBytes,
  };
}

module.exports = {
  initDataStore,
  loadStorePayload,
  saveStorePayload,
  getDataStoreInfo,
  getDataDir: () => dataDir,
  getDbPath: () => dbPath,
};
