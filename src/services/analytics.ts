/**
 * Lightweight analytics service for tracking user events.
 * Currently logs to console - can be extended to send to analytics providers.
 */

interface AnalyticsParams {
  [key: string]: any;
}

/**
 * Log an analytics event with optional parameters.
 * This is a fire-and-forget operation that never throws errors.
 * 
 * @param eventName - The name of the event to track
 * @param params - Optional parameters to include with the event
 */
export function logEvent(eventName: string, params?: AnalyticsParams): void {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = params 
      ? `[Analytics] ${eventName} - ${JSON.stringify(params)}`
      : `[Analytics] ${eventName}`;
    
    console.log(`${timestamp} ${logMessage}`);
  } catch (error) {
    // Silently fail - analytics should never block the UI
    // In production, you might want to queue failed events for retry
  }
}

/**
 * Track when a user adds a race result
 */
export function trackResultAdded(eventId: string, seconds: number, distanceLabel?: string): void {
  logEvent('result_added', {
    eventId,
    seconds,
    distanceLabel
  });
}

/**
 * Track when a user views friend comparisons for a result
 */
export function trackResultViewCompare(eventId: string, friendsCount: number): void {
  logEvent('result_view_compare', {
    eventId,
    friendsCount
  });
}

/**
 * Track when a user toggles between map and list view in Discover
 */
export function trackDiscoverToggleMap(to: 'map' | 'list'): void {
  logEvent('discover_toggle_map', {
    to
  });
}

/**
 * Track when a user follows a provider
 */
export function trackProviderFollow(providerId: string): void {
  logEvent('provider_follow', {
    providerId
  });
}

/**
 * Track when a user unfollows a provider
 */
export function trackProviderUnfollow(providerId: string): void {
  logEvent('provider_unfollow', {
    providerId
  });
}