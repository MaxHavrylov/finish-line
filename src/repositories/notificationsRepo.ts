import { getDb } from '../db/index';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: string;
  read: number;
}

interface CreateNotificationInput {
  id?: string;
  type: string;
  title: string;
  body?: string;
}

/**
 * Generate a unique notification ID
 */
function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Convert database row to notification object
 */
function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body || undefined,
    createdAt: row.createdAt,
    read: row.read === 1
  };
}

/**
 * Add a new notification
 */
export async function addNotification(input: CreateNotificationInput): Promise<void> {
  const db = getDb();
  const id = input.id || generateId();
  const createdAt = new Date().toISOString();

  db.runSync(
    `INSERT INTO notifications (id, type, title, body, createdAt, read)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [id, input.type, input.title, input.body || null, createdAt]
  );
}

/**
 * List all notifications, ordered by creation date (newest first)
 */
export async function listAll(): Promise<Notification[]> {
  const db = getDb();
  const rows = db.getAllSync<NotificationRow>(
    `SELECT id, type, title, body, createdAt, read 
     FROM notifications 
     ORDER BY createdAt DESC`
  );
  
  return rows.map(rowToNotification);
}

/**
 * Mark a specific notification as read
 */
export async function markRead(id: string): Promise<void> {
  const db = getDb();
  db.runSync(
    `UPDATE notifications SET read = 1 WHERE id = ?`,
    [id]
  );
}

/**
 * Mark all notifications as read
 */
export async function markAllRead(): Promise<void> {
  const db = getDb();
  db.runSync(`UPDATE notifications SET read = 1`);
}

/**
 * Get count of unread notifications
 */
export async function getUnreadCount(): Promise<number> {
  const db = getDb();
  const result = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM notifications WHERE read = 0`
  );
  return result?.count || 0;
}

/**
 * Delete all notifications (useful for testing/cleanup)
 */
export async function deleteAll(): Promise<void> {
  const db = getDb();
  db.runSync(`DELETE FROM notifications`);
}

/**
 * Create sample notifications for testing
 */
export async function createSampleNotifications(): Promise<void> {
  try {
    // Only create samples if no notifications exist
    const count = await getUnreadCount();
    const total = (await listAll()).length;
    
    if (total === 0) {
      console.log('[Notifications] Creating sample notifications for testing...');
      
      await addNotification({
        type: 'provider_follow',
        title: 'Following Spartan Race',
        body: 'You will receive updates about their events'
      });
      
      await addNotification({
        type: 'system',
        title: 'Welcome to FinishLine!',
        body: 'Start following providers and managing your races'
      });
    }
  } catch (error) {
    console.warn('Failed to create sample notifications:', error);
  }
}