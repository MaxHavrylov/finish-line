// In-memory cache for prefetched data to speed up first interactions
import type { FutureUserRace } from '../types/events';

interface PrefetchCache {
  favoriteIds?: Set<string>;
  futureRaces?: Array<FutureUserRace & {
    title: string;
    minDistanceLabel?: string;
    eventCategory: string;
  }>;
  followedProviders?: Set<string>;
  lastUpdated?: number;
}

// Module-level cache for instant access
let prefetchCache: PrefetchCache = {};

/**
 * Get cached favorite IDs (instant access)
 */
export function getCachedFavoriteIds(): Set<string> | null {
  return prefetchCache.favoriteIds || null;
}

/**
 * Get cached future races (instant access)
 */
export function getCachedFutureRaces(): Array<FutureUserRace & {
  title: string;
  minDistanceLabel?: string;
  eventCategory: string;
}> | null {
  return prefetchCache.futureRaces || null;
}

/**
 * Get cached followed provider IDs (instant access)
 */
export function getCachedFollowedProviders(): Set<string> | null {
  return prefetchCache.followedProviders || null;
}

/**
 * Check if an event is favorited (instant access)
 */
export function isCachedFavorite(eventId: string): boolean | null {
  const favorites = getCachedFavoriteIds();
  return favorites ? favorites.has(eventId) : null;
}

/**
 * Check if a provider is followed (instant access)
 */
export function isCachedFollowed(providerId: string): boolean | null {
  const followed = getCachedFollowedProviders();
  return followed ? followed.has(providerId) : null;
}

/**
 * Update favorite IDs cache
 */
export function setCachedFavoriteIds(favoriteIds: Set<string>): void {
  prefetchCache.favoriteIds = favoriteIds;
  prefetchCache.lastUpdated = Date.now();
}

/**
 * Update future races cache
 */
export function setCachedFutureRaces(futureRaces: Array<FutureUserRace & {
  title: string;
  minDistanceLabel?: string;
  eventCategory: string;
}>): void {
  prefetchCache.futureRaces = futureRaces;
  prefetchCache.lastUpdated = Date.now();
}

/**
 * Update followed providers cache
 */
export function setCachedFollowedProviders(followedProviders: Set<string>): void {
  prefetchCache.followedProviders = followedProviders;
  prefetchCache.lastUpdated = Date.now();
}

/**
 * Add/remove a favorite from cache (for optimistic updates)
 */
export function updateCachedFavorite(eventId: string, isFavorite: boolean): void {
  if (!prefetchCache.favoriteIds) {
    prefetchCache.favoriteIds = new Set();
  }
  
  if (isFavorite) {
    prefetchCache.favoriteIds.add(eventId);
  } else {
    prefetchCache.favoriteIds.delete(eventId);
  }
}

/**
 * Add/remove a followed provider from cache (for optimistic updates)
 */
export function updateCachedFollowed(providerId: string, isFollowed: boolean): void {
  if (!prefetchCache.followedProviders) {
    prefetchCache.followedProviders = new Set();
  }
  
  if (isFollowed) {
    prefetchCache.followedProviders.add(providerId);
  } else {
    prefetchCache.followedProviders.delete(providerId);
  }
}

/**
 * Clear all cached data (useful for user logout, etc.)
 */
export function clearPrefetchCache(): void {
  prefetchCache = {};
}

/**
 * Get cache status for debugging
 */
export function getPrefetchCacheStatus(): {
  hasFavorites: boolean;
  hasRaces: boolean;
  hasProviders: boolean;
  favoritesCount: number;
  racesCount: number;
  providersCount: number;
  lastUpdated?: number;
} {
  return {
    hasFavorites: !!prefetchCache.favoriteIds,
    hasRaces: !!prefetchCache.futureRaces,
    hasProviders: !!prefetchCache.followedProviders,
    favoritesCount: prefetchCache.favoriteIds?.size || 0,
    racesCount: prefetchCache.futureRaces?.length || 0,
    providersCount: prefetchCache.followedProviders?.size || 0,
    lastUpdated: prefetchCache.lastUpdated
  };
}