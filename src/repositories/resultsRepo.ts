/**
 * Repository for race results comparison data
 * Contains mock data for friends' race results
 */

export interface FriendResult {
  userId: string;
  userName: string;
  resultTimeSeconds: number;
  eventId: string;
}

// Mock data for friends' race results
// In a real app, this would come from a backend API
const mockFriendsResults: FriendResult[] = [
  // Prague Marathon results
  { userId: 'friend1', userName: 'Alice Johnson', resultTimeSeconds: 12600, eventId: 'evt_2' }, // 3:30:00
  { userId: 'friend2', userName: 'Bob Smith', resultTimeSeconds: 14400, eventId: 'evt_2' }, // 4:00:00
  { userId: 'friend3', userName: 'Charlie Brown', resultTimeSeconds: 11700, eventId: 'evt_2' }, // 3:15:00
  { userId: 'friend4', userName: 'Diana Prince', resultTimeSeconds: 13500, eventId: 'evt_2' }, // 3:45:00
  { userId: 'friend5', userName: 'Erik Jensen', resultTimeSeconds: 15300, eventId: 'evt_2' }, // 4:15:00

  // Berlin Marathon results
  { userId: 'friend1', userName: 'Alice Johnson', resultTimeSeconds: 12300, eventId: 'evt_1' }, // 3:25:00
  { userId: 'friend2', userName: 'Bob Smith', resultTimeSeconds: 14100, eventId: 'evt_1' }, // 3:55:00
  { userId: 'friend6', userName: 'Frank Miller', resultTimeSeconds: 13200, eventId: 'evt_1' }, // 3:40:00
  { userId: 'friend7', userName: 'Grace Lee', resultTimeSeconds: 12900, eventId: 'evt_1' }, // 3:35:00

  // Spartan Race results
  { userId: 'friend3', userName: 'Charlie Brown', resultTimeSeconds: 5400, eventId: 'evt_3' }, // 1:30:00
  { userId: 'friend4', userName: 'Diana Prince', resultTimeSeconds: 6300, eventId: 'evt_3' }, // 1:45:00
  { userId: 'friend8', userName: 'Henry Ford', resultTimeSeconds: 4800, eventId: 'evt_3' }, // 1:20:00
  { userId: 'friend9', userName: 'Ivy Watson', resultTimeSeconds: 5700, eventId: 'evt_3' }, // 1:35:00
];

export const resultsRepo = {
  /**
   * Get friends' results for a specific event
   * @param eventId The event ID to get results for
   * @param friendIds Array of friend user IDs to filter by
   * @returns Array of friend results for the event, sorted by time (fastest first)
   */
  async getFriendsResults(eventId: string, friendIds: string[]): Promise<FriendResult[]> {
    // Simulate API delay
    await new Promise<void>(resolve => setTimeout(resolve, 100));
    
    const results = mockFriendsResults
      .filter(result => result.eventId === eventId && friendIds.includes(result.userId))
      .sort((a, b) => a.resultTimeSeconds - b.resultTimeSeconds);
    
    return results;
  },

  /**
   * Get all available results for an event (for testing/development)
   */
  async getAllResultsForEvent(eventId: string): Promise<FriendResult[]> {
    await new Promise<void>(resolve => setTimeout(resolve, 100));
    
    return mockFriendsResults
      .filter(result => result.eventId === eventId)
      .sort((a, b) => a.resultTimeSeconds - b.resultTimeSeconds);
  },

  /**
   * Calculate comparison statistics
   */
  calculateComparisons(userTime: number, friendTimes: number[]): {
    vsBest: number;
    vsMedian: number;
    vsLast: number;
  } {
    if (friendTimes.length === 0) {
      return { vsBest: 0, vsMedian: 0, vsLast: 0 };
    }

    const sortedTimes = [...friendTimes].sort((a, b) => a - b);
    const best = sortedTimes[0];
    const last = sortedTimes[sortedTimes.length - 1];
    
    // Calculate median
    const mid = Math.floor(sortedTimes.length / 2);
    const median = sortedTimes.length % 2 === 0
      ? (sortedTimes[mid - 1] + sortedTimes[mid]) / 2
      : sortedTimes[mid];

    return {
      vsBest: userTime - best,
      vsMedian: userTime - median,
      vsLast: userTime - last
    };
  }
};