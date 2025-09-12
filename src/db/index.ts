// expo-sqlite bootstrap + helpers + upsert for events
import * as SQLite from "expo-sqlite";
import { EventDetails, EventSummary, EventDistance } from "../types/events";
import { runMigrations } from "./schema";

const DB_NAME = "finishline.db";

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
    bootstrap(db);
  }
  return db;
}

function bootstrap(database: SQLite.SQLiteDatabase) {
  database.execSync(`PRAGMA journal_mode = WAL;`);
  // app meta
  database.execSync(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
  `);
  // ✅ pass db instance to avoid require cycle
  runMigrations(database);
  database.runSync(
    "INSERT OR REPLACE INTO app_meta(key, value) VALUES(?, ?)",
    ["db_version", "2"]
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

// --- Upsert helpers ---

export function upsertEvents(details: EventDetails[]) {
  const database = getDb();
  database.execSync("BEGIN");
  try {
    for (const e of details) {
      database.runSync(
        `
        INSERT INTO events(id, title, start_date, city, country, lat, lng, event_category, status, cover_image, updated_at, deleted_at, min_distance_label)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title,
          start_date=excluded.start_date,
          city=excluded.city,
          country=excluded.country,
          lat=excluded.lat,
          lng=excluded.lng,
          event_category=excluded.event_category,
          status=excluded.status,
          cover_image=excluded.cover_image,
          updated_at=excluded.updated_at,
          deleted_at=excluded.deleted_at,
          min_distance_label=excluded.min_distance_label
        `,
        [
          e.id,
          e.title,
          e.startDate,
          e.city ?? null,
          e.country ?? null,
          e.lat ?? null,
          e.lng ?? null,
          e.eventCategory,
          e.status,
          e.coverImage ?? null,
          e.updatedAt,
          e.deletedAt ?? null,
          e.minDistanceLabel ?? null
        ]
      );

      // Replace distances
      database.runSync("DELETE FROM event_distances WHERE event_id = ?", [e.id]);
      for (const d of e.distances) {
        database.runSync(
          `
          INSERT INTO event_distances(id, event_id, label, distance_km, type, price_from, cutoff_minutes, wave_info)
          VALUES(?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            d.id,
            e.id,
            d.label,
            d.distanceKm ?? null,
            d.type,
            d.priceFrom ?? null,
            d.cutoffMinutes ?? null,
            d.waveInfo ?? null
          ]
        );
      }
    }
    database.execSync("COMMIT");
  } catch (err) {
    database.execSync("ROLLBACK");
    throw err;
  }
}

export function listEventSummaries(): EventSummary[] {
  const database = getDb();
  const rows = database.getAllSync<EventSummary & { start_date: string; updated_at: string }>(
    `SELECT id, title, start_date, city, country, lat, lng, event_category as eventCategory,
            status, cover_image as coverImage, updated_at as updatedAt, deleted_at as deletedAt,
            min_distance_label as minDistanceLabel
     FROM events
     WHERE deleted_at IS NULL
     ORDER BY datetime(start_date) ASC`
  );
  return rows.map(r => ({
    ...r,
    startDate: r.start_date,
    updatedAt: r.updated_at
  }));
}

export function getEventDetails(id: string) {
  const database = getDb();
  const evt = database.getFirstSync<
    (EventSummary & { start_date: string; updated_at: string }) | undefined
  >(
    `SELECT id, title, start_date, city, country, lat, lng, event_category as eventCategory,
            status, cover_image as coverImage, updated_at as updatedAt, deleted_at as deletedAt,
            min_distance_label as minDistanceLabel
     FROM events WHERE id = ?`,
    [id]
  );

  if (!evt) return undefined;

  const distances = database.getAllSync<EventDistance>(
    `SELECT id, event_id as eventId, label, distance_km as distanceKm, type, price_from as priceFrom, cutoff_minutes as cutoffMinutes, wave_info as waveInfo
     FROM event_distances WHERE event_id = ?`,
    [id]
  );

  return {
    ...evt,
    startDate: (evt as any).start_date,
    updatedAt: (evt as any).updated_at,
    distances
  };
}