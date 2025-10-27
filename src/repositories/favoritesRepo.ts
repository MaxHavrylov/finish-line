// repositories/favoritesRepo.ts
import { getDb } from "../db";
import { 
  getCachedFavoriteIds, 
  isCachedFavorite, 
  updateCachedFavorite,
  setCachedFavoriteIds 
} from "../utils/prefetchCache";

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
  // Try cache first for instant access
  const cached = isCachedFavorite(eventId);
  if (cached !== null) {
    return cached;
  }

  // Fall back to database if not cached
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
      // Update cache optimistically for instant UI feedback
      updateCachedFavorite(eventId, false);
      return false;
    } else {
      db.runSync(
        `INSERT OR REPLACE INTO ${TABLE}(event_id, created_at) VALUES(?, ?)`,
        [eventId, Date.now()]
      );
      db.execSync("COMMIT");
      // Update cache optimistically for instant UI feedback
      updateCachedFavorite(eventId, true);
      return true;
    }
  } catch (e) {
    db.execSync("ROLLBACK");
    throw e;
  }
}