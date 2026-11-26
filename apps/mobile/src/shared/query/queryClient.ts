import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

import { keyValueStorage } from '@/shared/storage';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a saved cache stays valid. gcTime must be >= maxAge, or saved data is dropped early. */
export const CACHE_MAX_AGE_MS = 7 * DAY_MS;

/** Change this string to invalidate every saved cache (new data shape, new demo dataset). */
export const CACHE_BUSTER = 'b5-1';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { gcTime: CACHE_MAX_AGE_MS, staleTime: 30_000, retry: 1 },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: keyValueStorage,
  key: 'ndaohody:query-cache',
  throttleTime: 1000,
});

/** Empties the cache in memory and on the device. */
export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  await queryPersister.removeClient();
}
