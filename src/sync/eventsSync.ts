// Sync routines: pull events from API and upsert into SQLite cache.

import { api } from "../services/api";
import { upsertEvents } from "../db";

const META_LAST_SYNC = "events.last_sync";

import { getItem, setItem } from "../utils/storage";

export async function syncEvents(): Promise<void> {
  // In the future use: const since = await getItem<string>(META_LAST_SYNC);
  const since: string | undefined = undefined;

  const events = await api.listEvents(since ? { since } : undefined);
  upsertEvents(events);

  // Dev-only: seed event_providers if empty
  if (__DEV__ && events.length > 0) {
    const { providersRepo } = await import('../repositories/providersRepo');
    const eventIds = events.slice(0, 3).map(e => e.id);
    const providerIds = ['spartan', 'ironman', 'marathon']; // Example provider IDs
    await providersRepo.seedEventProvidersIfEmpty(eventIds, providerIds);
  }

  await setItem(META_LAST_SYNC, new Date().toISOString());
}