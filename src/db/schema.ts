// SQLite schema and migrations for events + event_distances + favorites
import type * as SQLite from "expo-sqlite";

export function runMigrations(db: SQLite.SQLiteDatabase) {
  // Migrations table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      run_at TEXT NOT NULL
    );
  `);

  const apply = (name: string, sql: string) => {
    const row = db.getFirstSync<{ name: string }>(
      "SELECT name FROM _migrations WHERE name = ?",
      [name]
    );
    if (row) return;

    db.execSync("BEGIN");
    try {
      db.execSync(sql);
      db.runSync(
        "INSERT INTO _migrations(name, run_at) VALUES(?, ?)",
        [name, new Date().toISOString()]
      );
      db.execSync("COMMIT");
    } catch (e) {
      db.execSync("ROLLBACK");
      throw e;
    }
  };

  // 001 - events + event_distances
  apply(
    "001_events_and_distances",
    `
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      start_date TEXT NOT NULL,
      city TEXT,
      country TEXT,
      lat REAL,
      lng REAL,
      event_category TEXT NOT NULL,
      status TEXT NOT NULL,
      cover_image TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      min_distance_label TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
    CREATE INDEX IF NOT EXISTS idx_events_category ON events(event_category);
    CREATE INDEX IF NOT EXISTS idx_events_updated_at ON events(updated_at);

    CREATE TABLE IF NOT EXISTS event_distances (
      id TEXT PRIMARY KEY NOT NULL,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      distance_km REAL,
      type TEXT NOT NULL,
      price_from REAL,
      cutoff_minutes INTEGER,
      wave_info TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_event_distances_event_id ON event_distances(event_id);
    `
  );

  // 002 - favorites
  apply(
    "002_favorites",
    `
    CREATE TABLE IF NOT EXISTS favorites (
      event_id TEXT PRIMARY KEY NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at);
    `
  );

  // 003 - user_races
  apply(
    "003_user_races",
    `
    CREATE TABLE IF NOT EXISTS user_races (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('FUTURE','PAST','CANCELLED')),
      bib_number TEXT NULL,
      wave_number TEXT NULL,
      start_time_local TEXT NULL,
      target_time_minutes INTEGER NULL,
      result_time_seconds INTEGER NULL,
      note TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_races_event_id ON user_races(event_id);
    CREATE INDEX IF NOT EXISTS idx_user_races_status ON user_races(status);
    `
  );
}