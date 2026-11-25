import type { Reservation, StatutReservation, Trajet } from '@contract';

import { addMinutes } from '@/shared/utils';

import { HttpError } from './server';
import { iso } from './time';
import type { MockDb } from './types';

/** Validated rule: the driver waits 15 minutes once on the spot. */
export const WAIT_MINUTES = 15;

/**
 * GAP #5 (to send to the backend): the contract counts `prolongations` but gives
 * neither their length nor who asks. Validated choice: +5 min, asked by the driver.
 */
export const EXTENSION_MINUTES = 5;

/** Statuses where the passenger is still on the trip (not finished, not cancelled). */
export const RIDE_ACTIVE: readonly StatutReservation[] = ['acceptee', 'chauffeur_sur_place', 'en_course'];

/** The only allowed moves. Every status change in the simulated server goes through this table. */
const NEXT: Record<StatutReservation, readonly StatutReservation[]> = {
  en_attente: ['acceptee', 'refusee', 'expiree', 'annulee_passager'],
  acceptee: ['chauffeur_sur_place', 'annulee_chauffeur'],
  chauffeur_sur_place: ['en_course', 'absent', 'annulee_chauffeur'],
  en_course: ['terminee'],
  refusee: [],
  expiree: [],
  terminee: [],
  absent: [],
  annulee_passager: [],
  annulee_chauffeur: [],
};

/** Shown in error messages (the server's messages reach the user). */
const STATUS_LABEL: Record<StatutReservation, string> = {
  en_attente: 'en attente',
  acceptee: 'acceptée',
  refusee: 'refusée',
  expiree: 'expirée',
  chauffeur_sur_place: 'chauffeur sur place',
  en_course: 'en course',
  terminee: 'terminée',
  absent: 'passager absent',
  annulee_passager: 'annulée par le passager',
  annulee_chauffeur: 'annulée par le chauffeur',
};

export const canTransition = (from: StatutReservation, to: StatutReservation): boolean => NEXT[from].includes(to);

/** Moves a reservation to `to` and stamps the matching contract date. Throws a 409 if the move is not allowed. */
export function transition(reservation: Reservation, to: StatutReservation, now: Date): Reservation {
  if (!canTransition(reservation.statut, to)) {
    throw new HttpError(409, `Action impossible : la réservation est « ${STATUS_LABEL[reservation.statut]} ».`);
  }
  if (to === 'absent' && reservation.finAttente !== null && now < new Date(reservation.finAttente)) {
    throw new HttpError(409, 'Attends la fin des 15 minutes avant de déclarer le passager absent.');
  }
  const at = iso(now);
  reservation.statut = to;
  switch (to) {
    case 'acceptee':
    case 'refusee':
    case 'expiree':
      reservation.dateReponse = at;
      break;
    case 'chauffeur_sur_place':
      reservation.dateSurPlace = at;
      reservation.finAttente = iso(addMinutes(now, WAIT_MINUTES));
      break;
    case 'en_course':
      reservation.dateDebutCourse = at;
      break;
    case 'terminee':
      reservation.dateFinCourse = at;
      break;
    case 'annulee_passager':
    case 'annulee_chauffeur':
      reservation.dateAnnulation = at;
      break;
    case 'absent':
    case 'en_attente':
      break;
  }
  return reservation;
}

/** The driver gives the passenger more time (stays "on the spot"). */
export function extendWait(reservation: Reservation): Reservation {
  if (reservation.statut !== 'chauffeur_sur_place' || reservation.finAttente === null) {
    throw new HttpError(409, 'On ne peut prolonger l’attente que lorsque le chauffeur est sur place.');
  }
  reservation.finAttente = iso(addMinutes(new Date(reservation.finAttente), EXTENSION_MINUTES));
  reservation.prolongations += 1;
  return reservation;
}

/** Trip status follows its passengers: on board → en_cours; nobody left after the ride → termine. */
export function syncTripStatus(db: MockDb, trajet: Trajet): void {
  const active = db.reservations.filter((r) => r.trajetId === trajet.id && RIDE_ACTIVE.includes(r.statut));
  if (active.some((r) => r.statut === 'en_course')) {
    trajet.statut = 'en_cours';
  } else if (trajet.statut === 'en_cours' && active.length === 0) {
    trajet.statut = 'termine';
    db.positions.forEach((p) => {
      if (p.trajetId === trajet.id) p.enLigne = false;
    });
  }
}
