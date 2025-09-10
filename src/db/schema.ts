// SQLite schema and migrations for events + event_distances
import { getDb } from "@/db";

export function runMigrations() {
  const db = getDb();

  // Migrations table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      run_at TEXT NOT NULL
    );
  `);

  const apply = (name: string, sql: string) => {
    const row = db.getFirstSync<{ name: string }>("SELECT name FROM _migrations WHERE name = ?", [name]);
    if (row) return;

    db.execSync("BEGIN");
    try {
      db.execSync(sql);
      db.runSync("INSERT INTO _migrations(name, run_at) VALUES(?, ?)", [name, new Date().toISOString()]);
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
}