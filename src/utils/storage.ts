// Tiny AsyncStorage wrapper (useful very soon for settings)
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getItem<T>(key: string): Promise<T | undefined> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : undefined;
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

// Debounced filter persistence
const filterSaveTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Save filters to AsyncStorage with debouncing to avoid excessive writes
 * @param key Storage key for the filters
 * @param filters Filter object to save
 * @param debounceMs Debounce delay in milliseconds (default: 300ms)
 */
export function saveFiltersDebounced<T>(key: string, filters: T, debounceMs: number = 300): void {
  // Clear any existing timeout for this key
  const existingTimeout = filterSaveTimeouts.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Set new timeout
  const timeout = setTimeout(async () => {
    try {
      await setItem(key, filters);
      console.log(`[Storage] Saved filters to ${key}`);
    } catch (error) {
      console.warn(`[Storage] Failed to save filters to ${key}:`, error);
    } finally {
      filterSaveTimeouts.delete(key);
    }
  }, debounceMs);

  filterSaveTimeouts.set(key, timeout);
}

/**
 * Load filters from AsyncStorage
 * @param key Storage key for the filters
 * @returns Filters object or undefined if not found
 */
export async function loadFilters<T>(key: string): Promise<T | undefined> {
  try {
    const filters = await getItem<T>(key);
    if (filters) {
      console.log(`[Storage] Loaded filters from ${key}`);
    }
    return filters;
  } catch (error) {
    console.warn(`[Storage] Failed to load filters from ${key}:`, error);
    return undefined;
  }
}