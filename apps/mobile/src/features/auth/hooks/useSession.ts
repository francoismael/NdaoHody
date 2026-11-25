import { useSyncExternalStore } from 'react';

import {
  getSession,
  isSessionReady,
  setRole,
  signIn,
  signOut,
  subscribeSession,
  subscribeSessionReady,
  switchRole,
} from '../services/sessionService';
import type { Role } from '../types';

export type UseSession = {
  signedIn: boolean;
  role: Role;
  userId: number | null;
  isPassenger: boolean;
  isDriver: boolean;
  signIn: (userId?: number) => void;
  signOut: () => void;
  setRole: (role: Role) => void;
  switchRole: () => void;
};

/**
 * The session and its actions. Navigation guards read this hook:
 * changing the state is enough, navigation follows.
 */
export function useSession(): UseSession {
  const { signedIn, role, userId } = useSyncExternalStore(subscribeSession, getSession);
  return {
    signedIn,
    role,
    userId,
    isPassenger: role === 'passager',
    isDriver: role === 'chauffeur',
    signIn,
    signOut,
    setRole,
    switchRole,
  };
}

/** true once the saved session has been read from the device. */
export function useSessionReady(): boolean {
  return useSyncExternalStore(subscribeSessionReady, isSessionReady);
}
