/**
 * Pure booking rules, shared by the screens and the simulated server.
 * Only type imports: core may import this file directly (never the domain's index.ts).
 */
import type { StatutReservation } from '@contract';

import type { PathSpanProblem } from '@/shared/map';

/** Back ACTIVE_BOOKING_STATUSES: a passenger has one at most per trip (the server refuses a second one). */
export const ACTIVE_BOOKING_STATUSES: readonly StatutReservation[] = ['en_attente', 'acceptee', 'chauffeur_sur_place', 'en_course'];

/** Statuses after the driver's yes: the seats are taken. */
export const ACCEPTED_STATUSES: readonly StatutReservation[] = ['acceptee', 'chauffeur_sur_place', 'en_course', 'terminee'];

/** Back RefuseBookingRequest: free text, 3 to 255 characters once trimmed. The passenger sees it. */
export const REFUSAL_REASON_MIN = 3;
export const REFUSAL_REASON_MAX = 255;

/** Why a refusal reason is not accepted (null: it is). Checked by the screen before, the server after. */
export function refusalReasonError(motif: string): string | null {
  const length = motif.trim().length;
  if (length < REFUSAL_REASON_MIN) return 'Indique un motif de refus : le passager le verra.';
  if (length > REFUSAL_REASON_MAX) return `Ton motif est trop long (${REFUSAL_REASON_MAX} caractères au plus).`;
  return null;
}

/** Validated rule (contract: SuiviReservation.distanceMetres): under 500 m, "Je suis déjà sur place". */
export const ARRIVAL_RADIUS_METRES = 500;

export const isNearPickup = (distanceMetres: number): boolean => distanceMetres < ARRIVAL_RADIUS_METRES;

/** Validated rule (contract: Reservation.dateExpiration): the driver has 3 minutes to answer. */
export const ANSWER_DELAY_MINUTES = 3;

/**
 * Why a pickup / drop pair is refused (the walk rule, PICKUP_MAX_WALK_METRES). `choosing`: the point
 * being picked in the place picker (said before choosing it); null: the server's message for the pair.
 */
export function pathSpanMessage(problem: PathSpanProblem, maxMetres: number, choosing: 'pickup' | 'drop' | null = null): string {
  if (problem !== 'wrong_way') {
    const what = choosing ? 'Ton point' : problem === 'from_far' ? 'Ta prise en charge' : 'Ta dépose';
    return `${what} est trop loin de la route du chauffeur : choisis un point plus près de sa route (à moins de ${maxMetres} m).`;
  }
  if (choosing === 'pickup') return 'Le chauffeur passe ici après ta dépose : choisis un point plus tôt sur sa route.';
  if (choosing === 'drop') return 'Le chauffeur passe ici avant ta prise en charge : choisis un point plus loin sur sa route.';
  return 'Ta dépose doit être après ta prise en charge, dans le sens du chauffeur.';
}
