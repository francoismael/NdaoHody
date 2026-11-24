import { sessionStore } from '@/core/session/sessionStore';

import type { Role, Session } from '../types';

// Aujourd'hui : faux serveur (core). Demain : l'API, sans toucher aux écrans.

export const getSession = (): Session => sessionStore.getSnapshot();

export const subscribeSession = (listener: () => void): (() => void) =>
  sessionStore.subscribe(listener);

export const signIn = (): void => sessionStore.update({ signedIn: true });

export const signOut = (): void => sessionStore.update({ signedIn: false, role: 'passenger' });

export const setRole = (role: Role): void => sessionStore.update({ role });

export const switchRole = (): void =>
  setRole(getSession().role === 'passenger' ? 'driver' : 'passenger');
