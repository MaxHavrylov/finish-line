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
    if (row) {
      console.log(`[migration] ${name} already applied`);
      return;
    }

    console.log(`[migration] Applying ${name}...`);
    db.execSync("BEGIN");
    try {
      db.execSync(sql);
      db.runSync(
        "INSERT INTO _migrations(name, run_at) VALUES(?, ?)",
        [name, new Date().toISOString()]
      );
      db.execSync("COMMIT");
      console.log(`[migration] ${name} completed successfully`);
    } catch (e) {
      console.error(`[migration] ${name} failed:`, e);
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
  
  // 004 - follows
  apply(
    "004_follows",
    `
    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (follower_id, following_id)
    );

    CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
    `
  );

  // 005 - providers and event_providers
  apply(
    "005_providers",
    `
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      logoUrl TEXT,
      website TEXT
    );

    -- Drop and recreate event_providers table to ensure correct schema
    DROP TABLE IF EXISTS event_providers;
    
    CREATE TABLE event_providers (
      eventId TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      providerId TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      PRIMARY KEY (eventId, providerId)
    );

    CREATE INDEX idx_event_providers_event ON event_providers(eventId);
    CREATE INDEX idx_event_providers_provider ON event_providers(providerId);

    -- Insert some sample providers
    INSERT OR IGNORE INTO providers (id, name, logoUrl, website) VALUES
      ('spartan', 'Spartan Race', '', 'https://www.spartan.com'),
      ('ironman', 'IRONMAN', '', 'https://www.ironman.com'),
      ('marathon', 'Marathon Events', '', 'https://www.marathon.com');
    `
  );

  // 006 - provider_follows
  apply(
    "006_provider_follows",
    `
    -- Drop table if it exists to ensure clean creation
    DROP TABLE IF EXISTS provider_follows;
    
    CREATE TABLE provider_follows (
      userId TEXT NOT NULL,
      providerId TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (userId, providerId)
    );

    CREATE INDEX idx_provider_follows_user ON provider_follows(userId);
    CREATE INDEX idx_provider_follows_provider ON provider_follows(providerId);
    `
  );

  // 007 - fix event_providers schema
  apply(
    "007_fix_event_providers_schema",
    `
    -- Drop and recreate event_providers table with correct schema
    DROP TABLE IF EXISTS event_providers;
    
    CREATE TABLE event_providers (
      eventId TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      providerId TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      PRIMARY KEY (eventId, providerId)
    );

    CREATE INDEX idx_event_providers_event ON event_providers(eventId);
    CREATE INDEX idx_event_providers_provider ON event_providers(providerId);
    `
  );

  // 008 - fix providers table schema
  apply(
    "008_fix_providers_schema",
    `
    -- Drop and recreate providers table with correct schema
    DROP TABLE IF EXISTS providers;
    
    CREATE TABLE providers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      logoUrl TEXT,
      website TEXT
    );

    -- Re-insert sample providers
    INSERT INTO providers (id, name, logoUrl, website) VALUES
      ('spartan', 'Spartan Race', '', 'https://www.spartan.com'),
      ('ironman', 'IRONMAN', '', 'https://www.ironman.com'),
      ('marathon', 'Marathon Events', '', 'https://www.marathon.com');
    `
  );

  // 009 - notifications table
  apply(
    "009_notifications_table",
    `
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      createdAt TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX idx_notifications_created ON notifications(createdAt DESC);
    CREATE INDEX idx_notifications_read ON notifications(read);
    `
  );
}