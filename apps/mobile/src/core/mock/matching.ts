import type { Chemin, Position, Trajet, Utilisateur } from '@contract';

import {
  PICKUP_MAX_WALK_METRES,
  SEARCH_LATER_AFTER_MINUTES,
  SEARCH_LATER_BEFORE_MINUTES,
  SEARCH_NOW_MAX_MINUTES,
} from '@/features/trips/rules';
import { spanOnPath, type PathSpanProblem } from '@/shared/map';

import { approach } from './drive';
import { nearestIndex, segmentSeconds, toLngLat } from './tripGeo';
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

/**
 * The path point the passenger walks to (pickup), or from (drop: same threshold),
 * or null when the path is farther than the threshold.
 */
export function pickupPoint(trajet: Trajet, point: Position): { index: number; walkMetres: number } | null {
  const nearest = nearestIndex(trajet, point);
  if (nearest.distanceMeters > PICKUP_MAX_WALK_METRES) return null;
  return { index: nearest.index, walkMetres: Math.round(nearest.distanceMeters) };
}

/**
 * The search rule: the path passes near the passenger's departure, THEN, farther along
 * the same path, near his destination. A driver going the other way gets null.
 */
export function pathSpan(trajet: Trajet, depart: Position, destination: Position): { pickup: number; drop: number } | null {
  const span = pathSpanOrProblem(trajet, depart, destination);
  return typeof span === 'string' ? null : span;
}

/** Same rule, saying why it fails (booking: the passenger is told which point to move). */
export function pathSpanOrProblem(trajet: Trajet, depart: Position, destination: Position): { pickup: number; drop: number } | PathSpanProblem {
  const span = spanOnPath(trajet.chemin, toLngLat(depart), toLngLat(destination), PICKUP_MAX_WALK_METRES);
  return typeof span === 'string' ? span : { pickup: span.from, drop: span.to };
}

export type Arrival ={ minutes: number; positionChauffeur: Position; cheminVersPassager: Chemin };

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

export type Passing = { minutes: number; arrival: Arrival | null };

/**
 * In how many minutes the driver passes the point at path `index`, on the demo clock.
 * On the road: the R3 engine (`arrivalAt`). Planned: departure + road time to the point.
 * Null once passed (or a planned departure already late: it comes back once on the road).
 */
export function passingAt(db: MockDb, trajet: Trajet, index: number, now: Date): Passing | null {
  if (trajet.statut === 'en_route') {
    const arrival = arrivalAt(db, trajet, index, now);
    return arrival && { minutes: arrival.minutes, arrival };
  }
  const passesMs = new Date(trajet.dateDepart).getTime() + segmentSeconds(trajet, 0, index) * 1000;
  if (passesMs < now.getTime()) return null;
  return { minutes: Math.max(1, Math.ceil((passesMs - now.getTime()) / 60_000)), arrival: null };
}

/** The search time window (GAP #11), on the minutes until the driver passes. */
export function inSearchWindow(minutes: number, quand: string, now: Date): boolean {
  if (quand === 'maintenant') return minutes <= SEARCH_NOW_MAX_MINUTES;
  const wantedIn = (new Date(quand).getTime() - now.getTime()) / 60_000;
  return minutes >= wantedIn - SEARCH_LATER_BEFORE_MINUTES && minutes <= wantedIn + SEARCH_LATER_AFTER_MINUTES;
}

/** What the order of the passenger home AND the search reads. */
export type RankKey = { minutes: number; trajet: Trajet; chauffeur: Utilisateur };

/**
 * THE order of drivers for a passenger (GAP #12: the contract only says "rated first,
 * best rating first"): passes soonest first, then rated before unrated, best rating,
 * most trips driven, and lower trip id so the order never jumps between two refreshes.
 */
export function byRank(a: RankKey, b: RankKey): number {
  const noteA = a.chauffeur.noteMoyenne;
  const noteB = b.chauffeur.noteMoyenne;
  return (
    a.minutes - b.minutes ||
    Number(noteA === null) - Number(noteB === null) ||
    (noteB ?? 0) - (noteA ?? 0) ||
    b.chauffeur.coursesChauffeur - a.chauffeur.coursesChauffeur ||
    a.trajet.id - b.trajet.id
  );
}
