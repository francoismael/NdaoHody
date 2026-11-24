import type { Session } from '@/features/auth/types';

/**
 * État global de la session (connecté, rôle actif), SIMULÉ.
 * Gardé en mémoire pour R1 ; la persistance arrive en R2.
 * Seul le service de session (features/auth/services) y touche.
 */
let state: Session = { signedIn: false, role: 'passenger' };
const listeners = new Set<() => void>();

export const sessionStore = {
  getSnapshot(): Session {
    return state;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  update(patch: Partial<Session>): void {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  },
};
