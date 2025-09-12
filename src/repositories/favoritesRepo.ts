// repositories/favoritesRepo.ts
import { getDb } from "../db";

const TABLE = "favorites";

export async function listFavoriteIds(): Promise<Set<string>> {
  const db = getDb();
  const rows = db.getAllSync<{ event_id: string }>(
    `SELECT event_id FROM ${TABLE}`
  );
  const set = new Set<string>();
  rows.forEach(r => set.add(r.event_id));
  return set;
}

export async function isFavorite(eventId: string): Promise<boolean> {
  const db = getDb();
  const row = db.getFirstSync<{ event_id: string } | undefined>(
    `SELECT event_id FROM ${TABLE} WHERE event_id = ? LIMIT 1`,
    [eventId]
  );
  return !!row;
}

/**
 * Toggle favorite for an event.
 * @returns true if now favorited, false if unfavorited
 */
export async function toggleFavorite(eventId: string): Promise<boolean> {
  const db = getDb();
  const fav = await isFavorite(eventId);

  db.execSync("BEGIN");
  try {
    if (fav) {
      db.runSync(`DELETE FROM ${TABLE} WHERE event_id = ?`, [eventId]);
      db.execSync("COMMIT");
      return false;
    } else {
      db.runSync(
        `INSERT OR REPLACE INTO ${TABLE}(event_id, created_at) VALUES(?, ?)`,
        [eventId, Date.now()]
      );
      db.execSync("COMMIT");
      return true;
    }
  } catch (e) {
    db.execSync("ROLLBACK");
    throw e;
  }
}