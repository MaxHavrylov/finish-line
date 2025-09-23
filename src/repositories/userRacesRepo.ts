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
        id, eventId, status, bibNumber, waveNumber, 
        startTimeLocal, targetTimeMinutes, note,
        createdAt, updatedAt
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

export async function listFuture(): Promise<FutureUserRace[]> {
  const db = getDb();
  return db.getAllSync<FutureUserRace>(
    `SELECT id, eventId, bibNumber, waveNumber, startTimeLocal, targetTimeMinutes, note
     FROM user_races 
     WHERE status = 'FUTURE'
     ORDER BY startTimeLocal ASC NULLS LAST, createdAt DESC`
  );
}

export async function listPast(): Promise<PastUserRace[]> {
  const db = getDb();
  return db.getAllSync<PastUserRace>(
    `SELECT id, eventId, resultTimeSeconds, note
     FROM user_races 
     WHERE status = 'PAST'
     ORDER BY startTimeLocal DESC NULLS LAST, createdAt DESC`
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
     WHERE eventId = ?
     ORDER BY createdAt DESC
     LIMIT 1`,
    [eventId]
  ) ?? null;
}
