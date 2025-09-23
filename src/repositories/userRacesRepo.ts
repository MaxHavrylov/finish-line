import { getDb } from "@/db";

export type UserRaceFields = {
  bibNumber?: string;
  waveNumber?: string;
  startTimeLocal?: string;
  targetTimeMinutes?: number;
  note?: string;
};

export type UserRaceStatus = "FUTURE" | "PAST" | "CANCELLED";

export type UserRace = {
  id: string;
  eventId: string;
  status: UserRaceStatus;
} & UserRaceFields;

export async function getFutureRaceByEventId(eventId: string): Promise<UserRace | null> {
  const db = getDb();
  return db.getFirstSync<UserRace>(
    "SELECT * FROM user_races WHERE eventId = ? AND status = 'FUTURE' LIMIT 1",
    [eventId]
  );
}

export async function saveFutureRace(eventId: string, fields: UserRaceFields): Promise<UserRace> {
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO user_races (eventId, status, bibNumber, waveNumber, startTimeLocal, targetTimeMinutes, note)
     VALUES (?, 'FUTURE', ?, ?, ?, ?, ?)`,
    [
      eventId,
      fields.bibNumber || null,
      fields.waveNumber || null,
      fields.startTimeLocal || null,
      fields.targetTimeMinutes || null,
      fields.note || null
    ]
  );

  return {
    id: result.lastInsertRowId.toString(),
    eventId,
    status: "FUTURE" as const,
    ...fields
  };
}

export async function updateFields(id: string, patch: Partial<UserRaceFields & { status?: UserRaceStatus }>): Promise<void> {
  const sets: string[] = [];
  const values: any[] = [];

  Object.entries(patch).forEach(([key, value]) => {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (sets.length === 0) return;

  values.push(id);
  const db = getDb();
  db.runSync(
    `UPDATE user_races SET ${sets.join(", ")} WHERE id = ?`,
    values.map(v => v ?? null)
  );
}
