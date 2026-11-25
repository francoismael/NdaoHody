import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { ReactNode } from 'react';

import { CACHE_BUSTER, CACHE_MAX_AGE_MS, queryClient, queryPersister } from './queryClient';

/**
 * Query cache saved on the device. Used instead of QueryClientProvider:
 * it restores the cache first (queries wait meanwhile) and subscribes/unsubscribes with the component.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: CACHE_MAX_AGE_MS, buster: CACHE_BUSTER }}
      onSuccess={() => queryClient.resumePausedMutations()}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
