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
  // Enable WAL mode for better concurrency and performance
  database.execSync(`PRAGMA journal_mode = WAL;`);
  
  // Additional performance optimizations
  database.execSync(`PRAGMA synchronous = NORMAL;`); // Faster than FULL, still safe with WAL
  database.execSync(`PRAGMA cache_size = 2000;`); // Increase cache size for better performance
  database.execSync(`PRAGMA temp_store = memory;`); // Keep temp tables in memory
  
  // app meta
  database.execSync(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
  `);
  
  // ✅ pass db instance to avoid require cycle
  runMigrations(database);
  
  // Log successful WAL mode and index setup
  const walMode = database.getFirstSync<{ journal_mode: string }>('PRAGMA journal_mode');
  console.log('[db] WAL ON; indexes ok - Journal mode:', walMode?.journal_mode);
  
  // Diagnostic logging
  try {
    const providerCount = database.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM providers'
    );
    const eventProviderCount = database.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM event_providers'
    );
    const sampleMappings = database.getAllSync<{ eventId: string; providerId: string; providerName: string }>(
      'SELECT ep.eventId, ep.providerId, p.name as providerName FROM event_providers ep JOIN providers p ON p.id = ep.providerId LIMIT 3'
    );
    
    console.log('[db] Providers count:', providerCount?.count || 0);
    console.log('[db] Event-providers count:', eventProviderCount?.count || 0);
    console.log('[db] Sample mappings:', sampleMappings);
  } catch (error) {
    console.log('[db] Error fetching diagnostic info:', error);
  }
  
  database.runSync(
    "INSERT OR REPLACE INTO app_meta(key, value) VALUES(?, ?)",
    ["db_version", "4"]
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
  const rows = database.getAllSync<EventSummary & { start_date: string; updated_at: string; provider_name?: string }>(
    `SELECT e.id, e.title, e.start_date, e.city, e.country, e.lat, e.lng, e.event_category as eventCategory,
            e.status, e.cover_image as coverImage, e.updated_at as updatedAt, e.deleted_at as deletedAt,
            e.min_distance_label as minDistanceLabel, p.name as provider_name
     FROM events e
     LEFT JOIN event_providers ep ON e.id = ep.eventId
     LEFT JOIN providers p ON ep.providerId = p.id
     WHERE e.deleted_at IS NULL
     ORDER BY datetime(e.start_date) ASC`
  );
  return rows.map(r => ({
    ...r,
    startDate: r.start_date,
    updatedAt: r.updated_at,
    providerName: r.provider_name || undefined
  }));
}

export function getEventDetails(id: string) {
  console.log('[getEventDetails] Looking for event:', id);
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

  console.log('[getEventDetails] Found event:', !!evt, evt?.title);

  if (!evt) {
    console.log('[getEventDetails] Event not found in database for id:', id);
    return undefined;
  }

  const distances = database.getAllSync<EventDistance>(
    `SELECT id, event_id as eventId, label, distance_km as distanceKm, type, price_from as priceFrom, cutoff_minutes as cutoffMinutes, wave_info as waveInfo
     FROM event_distances WHERE event_id = ?`,
    [id]
  );

  console.log('[getEventDetails] Found distances:', distances.length);

  return {
    ...evt,
    startDate: (evt as any).start_date,
    updatedAt: (evt as any).updated_at,
    distances
  };
}