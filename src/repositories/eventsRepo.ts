import { upsertEvents, listEventSummaries, getEventDetails } from "@/db";
import { mockEvents } from "@/data/mockEvents";
import { EventDetails, EventSummary } from "@/types/events";

// For now we seed local DB with mock data.
// Later this will sync from the API (and call upsertEvents with payloads).
export async function seedMockIfEmpty(): Promise<void> {
  const list = listEventSummaries();
  if (list.length === 0) {
    upsertEvents(mockEvents);
  }
}

export async function getEvents(): Promise<EventSummary[]> {
  return listEventSummaries();
}

export async function getEventById(id: string): Promise<EventDetails | undefined> {
  return getEventDetails(id);
}