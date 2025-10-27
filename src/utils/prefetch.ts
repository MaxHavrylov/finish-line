// Prefetch manager for loading lightweight data at startup
import { listFavoriteIds } from '../repositories/favoritesRepo';
import { listFuture } from '../repositories/userRacesRepo';
import { providersRepo } from '../repositories/providersRepo';
import {
  setCachedFavoriteIds,
  setCachedFutureRaces,
  setCachedFollowedProviders,
  getPrefetchCacheStatus
} from '../utils/prefetchCache';

// For now, use a hardcoded user ID since there's no auth system
const DEFAULT_USER_ID = 'default-user';

/**
 * Prefetch all lightweight data needed for instant UI interactions
 * This runs non-blocking at app startup
 */
export async function prefetchStartupData(): Promise<void> {
  try {
    console.log('[prefetch] Starting startup data prefetch...');
    
    // Run all prefetch operations in parallel for speed
    const [favoriteIds, futureRaces, followedProviders] = await Promise.allSettled([
      prefetchFavorites(),
      prefetchFutureRaces(),
      prefetchFollowedProviders()
    ]);

    // Log results
    let successCount = 0;
    if (favoriteIds.status === 'fulfilled') successCount++;
    if (futureRaces.status === 'fulfilled') successCount++;
    if (followedProviders.status === 'fulfilled') successCount++;

    const cacheStatus = getPrefetchCacheStatus();
    console.log(`[prefetch] done - ${successCount}/3 successful, cached: ${cacheStatus.favoritesCount} favorites, ${cacheStatus.racesCount} races, ${cacheStatus.providersCount} providers`);

    // Log any failures for debugging
    if (favoriteIds.status === 'rejected') {
      console.warn('[prefetch] Favorites failed:', favoriteIds.reason);
    }
    if (futureRaces.status === 'rejected') {
      console.warn('[prefetch] Future races failed:', futureRaces.reason);
    }
    if (followedProviders.status === 'rejected') {
      console.warn('[prefetch] Followed providers failed:', followedProviders.reason);
    }

  } catch (error) {
    console.warn('[prefetch] Startup prefetch failed:', error);
  }
}

/**
 * Prefetch favorite event IDs
 */
async function prefetchFavorites(): Promise<void> {
  try {
    const favoriteIds = await listFavoriteIds();
    setCachedFavoriteIds(favoriteIds);
  } catch (error) {
    console.warn('[prefetch] Failed to load favorites:', error);
    throw error;
  }
}

/**
 * Prefetch future race data with lightweight fields
 */
async function prefetchFutureRaces(): Promise<void> {
  try {
    const futureRaces = await listFuture();
    setCachedFutureRaces(futureRaces);
  } catch (error) {
    console.warn('[prefetch] Failed to load future races:', error);
    throw error;
  }
}

/**
 * Prefetch followed provider IDs
 */
async function prefetchFollowedProviders(): Promise<void> {
  try {
    const followedProviders = await providersRepo.listFollowedIds(DEFAULT_USER_ID);
    setCachedFollowedProviders(followedProviders);
  } catch (error) {
    console.warn('[prefetch] Failed to load followed providers:', error);
    throw error;
  }
}

/**
 * Refresh specific cache after user action (e.g., toggling favorite)
 */
export async function refreshFavoritesCache(): Promise<void> {
  try {
    const favoriteIds = await listFavoriteIds();
    setCachedFavoriteIds(favoriteIds);
  } catch (error) {
    console.warn('[prefetch] Failed to refresh favorites cache:', error);
  }
}

/**
 * Refresh followed providers cache after user action
 */
export async function refreshFollowedProvidersCache(): Promise<void> {
  try {
    const followedProviders = await providersRepo.listFollowedIds(DEFAULT_USER_ID);
    setCachedFollowedProviders(followedProviders);
  } catch (error) {
    console.warn('[prefetch] Failed to refresh followed providers cache:', error);
  }
}

/**
 * Refresh future races cache after user action
 */
export async function refreshFutureRacesCache(): Promise<void> {
  try {
    const futureRaces = await listFuture();
    setCachedFutureRaces(futureRaces);
  } catch (error) {
    console.warn('[prefetch] Failed to refresh future races cache:', error);
  }
}