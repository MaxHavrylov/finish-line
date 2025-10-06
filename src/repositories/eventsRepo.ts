import { upsertEvents, listEventSummaries, getEventDetails, getDb } from "@/db";
import { mockEvents } from "@/data/mockEvents";
import { EventDetails, EventSummary } from "@/types/events";

// For now we seed local DB with mock data.
// Later this will sync from the API (and call upsertEvents with payloads).
export async function seedMockIfEmpty(): Promise<void> {
  const list = listEventSummaries();
  if (list.length === 0) {
    console.log('[seedMockIfEmpty] Seeding mock events...');
    upsertEvents(mockEvents);
  }
  
  // Always try to seed event-provider relationships if they're missing
  console.log('[seedMockIfEmpty] Checking event-provider relationships...');
  const { providersRepo } = await import('./providersRepo');
  const eventIds = mockEvents.map(e => e.id);
  const providerIds = ['spartan', 'ironman', 'marathon'];
  await providersRepo.seedEventProvidersIfEmpty(eventIds, providerIds);
  console.log('[seedMockIfEmpty] Event-provider seeding completed');
}

export async function getEvents(): Promise<EventSummary[]> {
  return listEventSummaries();
}

export async function listSummaries(options?: {
  filters?: any;
  page?: number;
  pageSize?: number;
}): Promise<EventSummary[]> {
  const { filters = {}, page = 1, pageSize = 50 } = options || {};
  
  try {
    console.log(`[eventsRepo] listSummaries filters=${JSON.stringify(filters)}, page=${page}, pageSize=${pageSize}`);
    
    const database = getDb();
    const offset = (page - 1) * pageSize;
    
    const rows = database.getAllSync<EventSummary & { start_date: string; updated_at: string; provider_name?: string }>(
      `SELECT e.id, e.title, e.start_date, e.city, e.country, e.lat, e.lng, e.event_category as eventCategory,
              e.status, e.cover_image as coverImage, e.updated_at as updatedAt, e.deleted_at as deletedAt,
              e.min_distance_label as minDistanceLabel, p.name AS providerName
       FROM events e
       LEFT JOIN event_providers ep ON ep.eventId = e.id
       LEFT JOIN providers p ON p.id = ep.providerId
       WHERE e.deleted_at IS NULL
       ORDER BY datetime(e.start_date) ASC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    
    let results = rows.map(r => ({
      ...r,
      startDate: r.start_date,
      updatedAt: r.updated_at,
      providerName: r.providerName || undefined
    }));
    
    // Fallback to mock data if no results from database
    if (results.length === 0) {
      console.log('[eventsRepo] fallback to mockEvents');
      
      // Convert mockEvents to the same format as database results
      const mockResults = mockEvents.map(event => ({
        id: event.id,
        title: event.title,
        start_date: event.startDate,
        city: event.city,
        country: event.country,
        lat: event.lat,
        lng: event.lng,
        eventCategory: event.eventCategory,
        status: event.status,
        coverImage: event.coverImage,
        updated_at: event.updatedAt,
        deletedAt: event.deletedAt,
        minDistanceLabel: event.minDistanceLabel,
        provider_name: undefined as string | undefined,
        startDate: event.startDate,
        updatedAt: event.updatedAt,
        providerName: undefined as string | undefined
      }));
      
      // Apply pagination to mock data
      const start = offset;
      const end = start + pageSize;
      results = mockResults.slice(start, end);
    }
    
    console.log(`[eventsRepo] rows count=${results.length}`);
    
    return results;
  } catch (error) {
    console.warn('[eventsRepo] listSummaries error', error instanceof Error ? error.message : error);
    throw error;
  }
}

export async function getEventById(id: string): Promise<EventDetails | undefined> {
  const details = getEventDetails(id);
  
  if (details) {
    return details;
  }
  
  // Fallback to mock data if event not found in database
  console.log('[eventsRepo] Event not found in DB, checking mock data for:', id);
  const mockEvent = mockEvents.find(e => e.id === id);
  if (mockEvent) {
    console.log('[eventsRepo] Found in mock data, converting to EventDetails');
    // Convert EventSummary to EventDetails
    return {
      ...mockEvent,
      startDate: mockEvent.startDate,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      distances: [
        {
          id: `${id}-distance-1`,
          eventId: id,
          label: mockEvent.minDistanceLabel || '5K',
          distanceKm: 5,
          type: 'run',
          priceFrom: 25,
          cutoffMinutes: 60,
          waveInfo: undefined
        }
      ]
    };
  }
  
  console.warn('[eventsRepo] Event not found in database or mock data:', id);
  return undefined;
}