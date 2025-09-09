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