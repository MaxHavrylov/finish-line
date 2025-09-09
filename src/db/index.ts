// Minimal expo-sqlite bootstrap + tiny helper utilities
import * as SQLite from "expo-sqlite";

// Note: keep versioning simple for now
const DB_NAME = "finishline.db";
const DB_VERSION = 1;

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
    bootstrap(db);
  }
  return db;
}

function bootstrap(database: SQLite.SQLiteDatabase) {
  database.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
  `);
  // store bootstrap version
  database.runSync(
    "INSERT OR REPLACE INTO app_meta(key, value) VALUES(?, ?)",
    ["db_version", String(DB_VERSION)]
  );
}

export function getDbVersion(): number {
  const database = getDb();
  const rs = database.getFirstSync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    ["db_version"]
  );
  return rs ? Number(rs.value) : 0;
}

// Example read helper (async)
export async function getMeta(key: string): Promise<string | undefined> {
  const database = getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    [key]
  );
  return row?.value ?? undefined;
}

// Example write helper (async)
export async function setMeta(key: string, value: string): Promise<void> {
  const database = getDb();
  await database.runAsync(
    "INSERT OR REPLACE INTO app_meta(key, value) VALUES(?, ?)",
    [key, value]
  );
}