import { isApiError } from '@/shared/utils';

import { demoStore } from '../demo/demoStore';
import { sessionStore } from '../session/sessionStore';
import type { HttpMethod } from './server';
import type { MockDb } from './types';

export type Dispatch = (db: MockDb, now: Date, userId: number | null, method: HttpMethod, path: string, body?: unknown) => unknown;

/**
 * The simulated driver answers the demo user's requests by himself, through the
 * same route a real driver calls (POST /reservations/:id/accept).
 * Runs lazily before each app request, like expiry: no timer to stop on reset.
 * Returns true if it changed the database.
 */
export function autoReply(db: MockDb, now: Date, dispatch: Dispatch): boolean {
  const { autoAccept, autoAcceptSeconds } = demoStore.getState();
  const me = sessionStore.getState().userId;
  if (!autoAccept || me === null) return false;
  let changed = false;
  db.reservations.forEach((reservation) => {
    if (reservation.statut !== 'en_attente' || reservation.passagerId !== me) return;
    if (now.getTime() - new Date(reservation.dateDemande).getTime() < autoAcceptSeconds * 1000) return;
    const trajet = db.trajets.find((t) => t.id === reservation.trajetId);
    if (!trajet || trajet.chauffeurId === me) return;
    try {
      dispatch(db, now, trajet.chauffeurId, 'POST', `/reservations/${reservation.id}/accept`);
      changed = true;
    } catch (error) {
      // A full car (409) is a normal answer: the request will expire, as in real life.
      if (!isApiError(error)) throw error;
    }
  });
  return changed;
}
