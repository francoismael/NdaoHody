import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import type { Session } from '@/features/auth/types';
import { keyValueStorage } from '@/shared/storage';

export const SIGNED_OUT: Session = { signedIn: false, role: 'passager', userId: null };

/**
 * App state of the session (signed in, active role, user id). Not server data:
 * kept in Zustand, saved on the device, apart from the query cache.
 * Only the session service (features/auth/services) touches it.
 */
export const sessionStore = createStore<Session>()(
  persist(() => SIGNED_OUT, {
    name: 'ndaohody:session',
    storage: createJSONStorage(() => keyValueStorage),
    version: 1,
  }),
);
