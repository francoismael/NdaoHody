import AsyncStorage from '@react-native-async-storage/async-storage';

/** The device key-value store (native). Only this file imports the library. */
export const keyValueStorage = AsyncStorage;

/** Reads a JSON value. Returns null when missing or unreadable. */
export async function readJson(key: string): Promise<unknown> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKeys(keys: string[]): Promise<void> {
  await AsyncStorage.multiRemove(keys);
}
