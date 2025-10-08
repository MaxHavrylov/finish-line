import { getDb } from '@/db';

/**
 * Repository for provider-related operations
 */
export const providersRepo = {
  /**
   * Get provider information by event ID
   */
  async getProviderByEventId(eventId: string): Promise<{ id: string; name: string; logoUrl?: string; website?: string } | null> {
    const database = getDb();
    const result = database.getFirstSync<{
      id: string;
      name: string;
      logoUrl?: string;
      website?: string;
    }>(
      'SELECT p.id, p.name, p.logoUrl, p.website FROM event_providers ep JOIN providers p ON p.id = ep.providerId WHERE ep.eventId = ? LIMIT 1',
      [eventId]
    );

    return result || null;
  },

  /**
   * Seeds event_providers table with initial mappings if empty (dev-only)
   */
  async seedEventProvidersIfEmpty(eventIds: string[], providerIds: string[]): Promise<void> {
    if (!__DEV__) return;

    const database = getDb();
    
    // Check if table is empty
    const countResult = database.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM event_providers'
    );
    
    if (countResult && countResult.count > 0) {
      return; // Table not empty, do nothing
    }

    // Guard array lengths and map first 3 events to providers
    const maxMappings = Math.min(eventIds.length, providerIds.length, 3);
    let mappedCount = 0;

    database.execSync('BEGIN');
    try {
      for (let i = 0; i < maxMappings; i++) {
        database.runSync(
          'INSERT INTO event_providers (eventId, providerId) VALUES (?, ?)',
          [eventIds[i], providerIds[i]]
        );
        mappedCount++;
      }
      database.execSync('COMMIT');
      console.log(`[seed] event_providers mapped: ${mappedCount}`);
    } catch (error) {
      database.execSync('ROLLBACK');
      console.warn('[seed] Failed to seed event_providers:', error);
    }
  },

  /**
   * List events by provider with pagination and filters
   */
  async listEventsByProvider(providerId: string, params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    dateWindow?: 'ANY' | '30D' | '90D';
    sort?: 'SOONEST' | 'LATEST';
  }): Promise<{
    id: string;
    name: string;
    logoUrl?: string;
    website?: string;
    events: Array<{
      id: string;
      title: string;
      startDate: string;
      city?: string;
      country?: string;
      eventCategory: string;
      coverImage?: string;
      minDistanceLabel?: string;
    }>;
    total?: number;
  }> {
    const database = getDb();
    const { 
      page = 1, 
      pageSize = 20, 
      search = '', 
      dateWindow = 'ANY', 
      sort = 'SOONEST' 
    } = params || {};
    const offset = (page - 1) * pageSize;

    // Get provider info
    const provider = database.getFirstSync<{
      id: string;
      name: string;
      logoUrl?: string;
      website?: string;
    }>(
      'SELECT id, name, logoUrl, website FROM providers WHERE id = ?',
      [providerId]
    );

    if (!provider) {
      throw new Error(`Provider with id ${providerId} not found`);
    }

    // Build query conditions
    let whereConditions = 'ep.providerId = ? AND e.deleted_at IS NULL';
    const queryParams: any[] = [providerId];

    // Add search filter
    if (search.trim()) {
      whereConditions += ' AND (e.title LIKE ? OR e.city LIKE ? OR e.country LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Add date window filter
    if (dateWindow !== 'ANY') {
      const now = new Date();
      let dateThreshold: Date;
      
      if (dateWindow === '30D') {
        dateThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else { // 90D
        dateThreshold = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      }
      
      whereConditions += ' AND datetime(e.start_date) BETWEEN datetime(?) AND datetime(?)';
      queryParams.push(now.toISOString(), dateThreshold.toISOString());
    }

    // Add sort order
    const sortOrder = sort === 'LATEST' ? 'DESC' : 'ASC';

    // Get total count for pagination (optional)
    const countResult = database.getFirstSync<{ total: number }>(
      `SELECT COUNT(*) as total FROM events e
       JOIN event_providers ep ON e.id = ep.eventId
       WHERE ${whereConditions}`,
      queryParams
    );

    // Get events for this provider
    const events = database.getAllSync<{
      id: string;
      title: string;
      startDate: string;
      city?: string;
      country?: string;
      eventCategory: string;
      coverImage?: string;
      minDistanceLabel?: string;
    }>(
      `SELECT e.id, e.title, e.start_date as startDate, e.city, e.country, 
              e.event_category as eventCategory, e.cover_image as coverImage,
              e.min_distance_label as minDistanceLabel
       FROM events e
       JOIN event_providers ep ON e.id = ep.eventId
       WHERE ${whereConditions}
       ORDER BY datetime(e.start_date) ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...queryParams, pageSize, offset]
    );

    return {
      ...provider,
      events,
      total: countResult?.total || 0
    };
  },

  /**
   * Check if user is following a provider
   */
  async isFollowing(userId: string, providerId: string): Promise<boolean> {
    try {
      const database = getDb();
      const result = database.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM provider_follows WHERE userId = ? AND providerId = ?',
        [userId, providerId]
      );
      return (result?.count || 0) > 0;
    } catch (error) {
      console.warn('[providersRepo] isFollowing error (table may not exist yet):', error);
      return false; // Default to not following if table doesn't exist
    }
  },

  /**
   * Follow a provider
   */
  async follow(userId: string, providerId: string): Promise<void> {
    try {
      const database = getDb();
      database.runSync(
        'INSERT OR IGNORE INTO provider_follows (userId, providerId, created_at) VALUES (?, ?, ?)',
        [userId, providerId, new Date().toISOString()]
      );
    } catch (error) {
      console.warn('[providersRepo] Failed to follow provider (table may not exist yet):', error);
      throw error;
    }
  },

  /**
   * Unfollow a provider
   */
  async unfollow(userId: string, providerId: string): Promise<void> {
    try {
      const database = getDb();
      database.runSync(
        'DELETE FROM provider_follows WHERE userId = ? AND providerId = ?',
        [userId, providerId]
      );
    } catch (error) {
      console.warn('[providersRepo] Failed to unfollow provider (table may not exist yet):', error);
      throw error;
    }
  }
};