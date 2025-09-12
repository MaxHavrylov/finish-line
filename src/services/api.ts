// Minimal API service (mocked for now).
// Later, replace the mock calls with real fetch() to your backend.

import { EventDetails } from "../types/events";
import { mockEvents } from "../data/mockEvents";

// Shape of server list response (can be different from EventDetails)
export type ApiEvent = EventDetails;

export interface ListEventsParams {
  // when we implement delta sync:
  since?: string; // ISO timestamp
}

export const api = {
  async listEvents(_params?: ListEventsParams): Promise<ApiEvent[]> {
    // TODO: replace with real fetch:
    // const res = await fetch(`${BASE_URL}/events?since=${params?.since ?? ""}`);
    // return res.json();
    await delay(200);
    return mockEvents;
  },

  async getEventById(id: string): Promise<ApiEvent | undefined> {
    await delay(150);
    return mockEvents.find((e) => e.id === id);
  }
};

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
}