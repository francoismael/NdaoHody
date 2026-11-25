import { DEMO_USER_ID } from '@/core/mock';
import { SIGNED_OUT, sessionStore } from '@/core/session/sessionStore';
import { clearQueryCache } from '@/shared/query';

import type { Role, Session } from '../types';

// Session = app state (Zustand, saved on the device). Never in the query cache.
// Block bodies: with `persist`, setState may return a Promise, so we do not return its result.

export const getSession = (): Session => sessionStore.getState();

export const subscribeSession = (listener: () => void): (() => void) => sessionStore.subscribe(listener);

/** false until the saved session is read back: guards must wait, or they redirect to /phone. */
export const isSessionReady = (): boolean => sessionStore.persist.hasHydrated();

export const subscribeSessionReady = (listener: () => void): (() => void) =>
  sessionStore.persist.onFinishHydration(() => listener());

export const signIn = (userId: number = DEMO_USER_ID): void => {
  sessionStore.setState({ signedIn: true, userId });
};

/** New account: the code is right but the name is still missing, so the user stays in the sign-in flow. */
export const setPendingUser = (userId: number): void => {
  sessionStore.setState({ signedIn: false, userId });
};

export const signOut = (): void => {
  sessionStore.setState(SIGNED_OUT);
  void clearQueryCache(); // the next account must not see this one's data
};

export const setRole = (role: Role): void => {
  sessionStore.setState({ role });
};

export const switchRole = (): void => setRole(getSession().role === 'passager' ? 'chauffeur' : 'passager');
