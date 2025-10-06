import { Provider, mockProviders } from '@/data/mockProviders';

/**
 * Repository for provider-related operations
 */
export const providersRepo = {
  /**
   * Get provider information by event ID
   */
  async getProviderByEventId(eventId: string): Promise<Provider | null> {
    // This would typically fetch from an API or database
    // For now, we'll return mock data based on event ID
    if (eventId === 'event-1') {
      return mockProviders.find((p: Provider) => p.id === 'spartan') || null;
    }
    return null;
  }
};