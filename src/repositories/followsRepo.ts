import { getDb } from "@/db";

/**
 * Check if a user is following another user
 * @param me The follower ID (typically "me")
 * @param otherId The ID of the user being followed
 * @returns True if following, false otherwise
 */
export async function isFollowing(me: string, otherId: string): Promise<boolean> {
  try {
    const db = getDb();
    const result = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND following_id = ?`,
      [me, otherId]
    );
    return (result?.count ?? 0) > 0;
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
}

/**
 * Follow a user
 * @param me The follower ID (typically "me")
 * @param otherId The ID of the user to follow
 */
export async function follow(me: string, otherId: string): Promise<void> {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    
    db.execSync("BEGIN");
    try {
      db.runSync(
        `INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)`,
        [me, otherId, now]
      );
      db.execSync("COMMIT");
    } catch (e) {
      db.execSync("ROLLBACK");
      throw e;
    }
  } catch (error) {
    console.error("Error following user:", error);
    throw new Error("Failed to follow user");
  }
}

/**
 * Unfollow a user
 * @param me The follower ID (typically "me")
 * @param otherId The ID of the user to unfollow
 */
export async function unfollow(me: string, otherId: string): Promise<void> {
  try {
    const db = getDb();
    
    db.execSync("BEGIN");
    try {
      db.runSync(
        `DELETE FROM follows WHERE follower_id = ? AND following_id = ?`,
        [me, otherId]
      );
      db.execSync("COMMIT");
    } catch (e) {
      db.execSync("ROLLBACK");
      throw e;
    }
  } catch (error) {
    console.error("Error unfollowing user:", error);
    throw new Error("Failed to unfollow user");
  }
}

/**
 * List all the users that a given user is following
 * @param me The follower ID (typically "me")
 * @returns Array of user IDs that the user is following
 */
export async function listFollowing(me: string): Promise<string[]> {
  try {
    const db = getDb();
    const results = db.getAllSync<{ following_id: string }>(
      `SELECT following_id FROM follows WHERE follower_id = ? ORDER BY created_at DESC`,
      [me]
    );
    return results.map(row => row.following_id);
  } catch (error) {
    console.error("Error listing followers:", error);
    return [];
  }
}
