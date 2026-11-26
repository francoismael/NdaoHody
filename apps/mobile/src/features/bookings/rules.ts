/**
 * Pure booking rules, shared by the screens and the simulated server.
 * Only type imports: core may import this file directly (never the domain's index.ts).
 */
import type { StatutReservation } from '@contract';

import type { PathSpanProblem } from '@/shared/map';

/** Back ACTIVE_BOOKING_STATUSES: a passenger has one at most per trip (the server refuses a second one). */
export const ACTIVE_BOOKING_STATUSES: readonly StatutReservation[] = ['en_attente', 'acceptee', 'chauffeur_sur_place', 'en_course'];

/** Validated rule (contract: SuiviReservation.distanceMetres): under 500 m, "Je suis déjà sur place". */
export const ARRIVAL_RADIUS_METRES = 500;

export const isNearPickup = (distanceMetres: number): boolean => distanceMetres < ARRIVAL_RADIUS_METRES;

/** Validated rule (contract: Reservation.dateExpiration): the driver has 3 minutes to answer. */
export const ANSWER_DELAY_MINUTES = 3;

/**
 * Why a pickup / drop pair is refused (the 800 m path rule). `choosing`: the point being picked
 * in the place picker (said before choosing it); null: the server's message for the pair.
 */
export function pathSpanMessage(problem: PathSpanProblem, maxMetres: number, choosing: 'pickup' | 'drop' | null = null): string {
  if (problem !== 'wrong_way') {
    const what = choosing ? 'Ce point' : problem === 'from_far' ? 'Ta prise en charge' : 'Ta dépose';
    return `${what} est à plus de ${maxMetres} m de la route du chauffeur : choisis plus près de sa route.`;
  }
  if (choosing === 'pickup') return 'Le chauffeur passe ici après ta dépose : choisis un point plus tôt sur sa route.';
  if (choosing === 'drop') return 'Le chauffeur passe ici avant ta prise en charge : choisis un point plus loin sur sa route.';
  return 'Ta dépose doit être après ta prise en charge, dans le sens du chauffeur.';
}
