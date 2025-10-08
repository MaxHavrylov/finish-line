import { getDb } from "@/db";
import type { FutureUserRace, PastUserRace, UserRaceStatus } from "../types/events";

// Simple UUID v4 generator (matches pattern in codebase)
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function saveFutureRace(
  eventId: string,
  fields?: {
    bibNumber?: string;
    waveNumber?: string;
    startTimeLocal?: string;
    targetTimeMinutes?: number;
    note?: string;
  }
): Promise<string> {
  const db = getDb();
  const id = generateUUID();
  const now = new Date().toISOString();

  try {
    db.execSync("BEGIN");
    db.runSync(
      `INSERT INTO user_races (
        id, event_id, status, bib_number, wave_number, 
        start_time_local, target_time_minutes, note,
        created_at, updated_at
      ) VALUES (?, ?, 'FUTURE', ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        eventId,
        fields?.bibNumber ?? null,
        fields?.waveNumber ?? null,
        fields?.startTimeLocal ?? null,
        fields?.targetTimeMinutes ?? null,
        fields?.note ?? null,
        now,
        now,
      ]
    );
    db.execSync("COMMIT");
    return id;
  } catch (e) {
    db.execSync("ROLLBACK");
    throw new Error(`Failed to save future race: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function listFuture(): Promise<Array<FutureUserRace & {
  title: string;
  minDistanceLabel?: string;
  eventCategory: string;
}>> {
  const db = getDb();
  return db.getAllSync<FutureUserRace & {
    title: string;
    minDistanceLabel?: string;
    eventCategory: string;
  }>(
    `SELECT 
      ur.id,
      ur.event_id as eventId,
      ur.bib_number as bibNumber,
      ur.wave_number as waveNumber,
      ur.start_time_local as startTimeLocal,
      ur.target_time_minutes as targetTimeMinutes,
      ur.note,
      e.title,
      e.min_distance_label as minDistanceLabel,
      e.event_category as eventCategory
     FROM user_races ur
     JOIN events e ON ur.event_id = e.id
     WHERE ur.status = 'FUTURE'
     ORDER BY ur.start_time_local ASC NULLS LAST, ur.created_at DESC`
  );
}

export async function listPast(): Promise<PastUserRace[]> {
  const db = getDb();
  return db.getAllSync<PastUserRace>(
    `SELECT 
      id,
      event_id as eventId,
      result_time_seconds as resultTimeSeconds,
      note
     FROM user_races 
     WHERE status = 'PAST'
     ORDER BY start_time_local DESC NULLS LAST, created_at DESC`
  );
}

export async function updateFields(
  id: string,
  patch: Partial<{
    bibNumber: string;
    waveNumber: string;
    startTimeLocal: string;
    targetTimeMinutes: number;
    note: string;
  }>
): Promise<void> {
  const db = getDb();
  const updates: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(patch)) {
    updates.push(`${key} = ?`);
    values.push(value === undefined ? null : value);
  }

  if (updates.length === 0) return;

  updates.push("updatedAt = ?");
  values.push(new Date().toISOString());
  values.push(id);

  try {
    db.execSync("BEGIN");
    db.runSync(
      `UPDATE user_races SET ${updates.join(", ")} WHERE id = ?`,
      values
    );
    db.execSync("COMMIT");
  } catch (e) {
    db.execSync("ROLLBACK");
    throw new Error(`Failed to update race: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function markAsPast(id: string, resultTimeSeconds?: number): Promise<void> {
  const db = getDb();
  try {
    db.execSync("BEGIN");
    db.runSync(
      `UPDATE user_races 
       SET status = 'PAST', 
           resultTimeSeconds = ?,
           updatedAt = ?
       WHERE id = ?`,
      [resultTimeSeconds ?? null, new Date().toISOString(), id]
    );
    db.execSync("COMMIT");
  } catch (e) {
    db.execSync("ROLLBACK");
    throw new Error(`Failed to mark race as past: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function getByEventId(
  eventId: string
): Promise<{ id: string; status: UserRaceStatus } | null> {
  const db = getDb();
  return db.getFirstSync<{ id: string; status: UserRaceStatus }>(
    `SELECT id, status
     FROM user_races
     WHERE event_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [eventId]
  ) ?? null;
}

export async function addResult(id: string, resultTimeSeconds: number): Promise<void> {
  const db = getDb();
  try {
    db.execSync("BEGIN");
    db.runSync(
      `UPDATE user_races 
       SET status = 'PAST', 
           result_time_seconds = ?,
           updated_at = ?
       WHERE id = ?`,
      [resultTimeSeconds, new Date().toISOString(), id]
    );
    db.execSync("COMMIT");
  } catch (e) {
    db.execSync("ROLLBACK");
    throw new Error(`Failed to add result: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function listPastWithMeta(): Promise<Array<PastUserRace & { 
  isPR?: boolean;
  title: string;
  minDistanceLabel?: string;
  eventCategory: string;
}>> {
  const db = getDb();
  
  // Get all past races with event details
  const pastRaces = db.getAllSync<PastUserRace & {
    title: string;
    minDistanceLabel?: string;
    eventCategory: string;
  }>(
    `SELECT ur.id, ur.event_id as eventId, ur.status, ur.bib_number as bibNumber,
            ur.wave_number as waveNumber, ur.start_time_local as startTimeLocal,
            ur.target_time_minutes as targetTimeMinutes, ur.result_time_seconds as resultTimeSeconds,
            ur.note, ur.created_at as createdAt, ur.updated_at as updatedAt,
            e.title, e.min_distance_label as minDistanceLabel, e.event_category as eventCategory
     FROM user_races ur
     JOIN events e ON ur.event_id = e.id
     WHERE ur.status = 'PAST' AND ur.result_time_seconds IS NOT NULL
     ORDER BY ur.updated_at DESC`
  );

  if (pastRaces.length === 0) return [];

  // Calculate PRs by category + distance combination
  const prMap = new Map<string, number>();
  
  pastRaces.forEach(race => {
    if (race.resultTimeSeconds) {
      const key = `${race.eventCategory}_${race.minDistanceLabel || 'unknown'}`;
      const current = prMap.get(key);
      if (!current || race.resultTimeSeconds < current) {
        prMap.set(key, race.resultTimeSeconds);
      }
    }
  });

  // Add isPR flag to races
  return pastRaces.map(race => ({
    ...race,
    isPR: race.resultTimeSeconds ? 
      prMap.get(`${race.eventCategory}_${race.minDistanceLabel || 'unknown'}`) === race.resultTimeSeconds : 
      false
  }));
}
