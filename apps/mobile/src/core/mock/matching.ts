import type { Chemin, Position, Trajet, Utilisateur } from '@contract';

import { PICKUP_MAX_WALK_METRES } from '@/features/trips/rules';

import { approach } from './drive';
import { nearestIndex } from './tripGeo';
import type { MockDb } from './types';

/**
 * Matching between a passenger and the drivers' paths: the ONE place where this rule
 * lives, used by the passenger home (GET /trips/around) and the search (POST /trips/search).
 * The real API will apply the same three checks.
 */

/** The passenger may see and book this trip: not his own, enough free seats, women-only rule. */
export function isOfferedTo(trajet: Trajet, user: Utilisateur, places: number): boolean {
  return trajet.chauffeurId !== user.id && trajet.placesLibres >= places && (!trajet.reserveFemmes || user.sexe === 'femme');
}

/** The path point the passenger walks to, or null when the path is farther than the threshold. */
export function pickupPoint(trajet: Trajet, point: Position): { index: number; walkMetres: number } | null {
  const nearest = nearestIndex(trajet, point);
  if (nearest.distanceMeters > PICKUP_MAX_WALK_METRES) return null;
  return { index: nearest.index, walkMetres: Math.round(nearest.distanceMeters) };
}

export type Arrival = { minutes: number; positionChauffeur: Position; cheminVersPassager: Chemin };

/**
 * When a driver on the road reaches a point of his path: road distance left, from the
 * R3 engine (`approach`), on the demo clock. Null once he has passed it, or when offline.
 */
export function arrivalAt(db: MockDb, trajet: Trajet, index: number, now: Date): Arrival | null {
  const [longitude, latitude] = trajet.chemin[index];
  const left = approach(db, trajet, { longitude, latitude }, now);
  if (!left) return null;
  const [lng, lat] = left.cheminVersPassager[0];
  return {
    minutes: Math.max(1, Math.ceil(left.secondes / 60)),
    positionChauffeur: { longitude: lng, latitude: lat },
    cheminVersPassager: left.cheminVersPassager,
  };
}

/** Soonest first; same minute → lower trip id, so the order does not jump every second. */
export const bySoonestArrival = (a: { arriveeDansMinutes: number; trajet: Trajet }, b: { arriveeDansMinutes: number; trajet: Trajet }): number =>
  a.arriveeDansMinutes - b.arriveeDansMinutes || a.trajet.id - b.trajet.id;
