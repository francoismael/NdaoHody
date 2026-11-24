import { useSyncExternalStore } from 'react';

import {
  getSession,
  setRole,
  signIn,
  signOut,
  subscribeSession,
  switchRole,
} from '../services/sessionService';
import type { Role } from '../types';

export type UseSession = {
  signedIn: boolean;
  role: Role;
  isPassenger: boolean;
  isDriver: boolean;
  signIn: () => void;
  signOut: () => void;
  setRole: (role: Role) => void;
  switchRole: () => void;
};

/**
 * La session et ses actions. Les gardes de navigation lisent ce hook :
 * changer l'état suffit, la navigation en découle.
 */
export function useSession(): UseSession {
  const { signedIn, role } = useSyncExternalStore(subscribeSession, getSession);
  return {
    signedIn,
    role,
    isPassenger: role === 'passenger',
    isDriver: role === 'driver',
    signIn,
    signOut,
    setRole,
    switchRole,
  };
}
