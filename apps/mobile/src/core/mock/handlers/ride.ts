import type { Reservation, StatutReservation, SuiviReservation, Trajet, TypeNotification } from '@contract';

import { isNearPickup } from '@/features/bookings/rules';

import { approach } from '../drive';
import { notify } from '../notify';
import { WAIT_MINUTES, extendWait, syncTripStatus, transition } from '../reservationFlow';
import { HttpError, findOr404, idParam, requireUser, type MockRoute, type RequestContext } from '../server';
import { iso } from '../time';
import { driverParties, reservationParties, toPublicProfile, userById } from '../views';

/**
 * The driver's actions during the ride. GAP #6 (to send to the backend):
 * these routes are not in the contract yet; names follow the existing ones.
 */

interface DriverAction {
  path: string;
  to: StatutReservation;
  notification: [TypeNotification, string, string];
  /** Extra server check before the move. */
  guard?: (ctx: RequestContext, reservation: Reservation, trajet: Trajet) => void;
}

/** "Je suis déjà sur place" only works close to the pickup point (ARRIVAL_RADIUS_METRES, same rule as the button). */
function nearPickupOnly(ctx: RequestContext, reservation: Reservation, trajet: Trajet): void {
  const left = approach(ctx.db, trajet, reservation.priseEnCharge, ctx.now);
  if (!left) throw new HttpError(409, 'Le trajet n’a pas encore démarré.');
  if (!isNearPickup(left.distanceMetres)) throw new HttpError(409, `Tu es encore à ${left.distanceMetres} m du passager.`);
}

const ACTIONS: DriverAction[] = [
  { path: 'arrived', to: 'chauffeur_sur_place', guard: nearPickupOnly, notification: ['chauffeur_sur_place', 'Ton chauffeur est là', `Il t’attend ${WAIT_MINUTES} minutes au point de prise en charge.`] },
  { path: 'start', to: 'en_course', notification: ['course_demarree', 'Course démarrée', 'Bonne route !'] },
  { path: 'no-show', to: 'absent', notification: ['attente_terminee', 'Attente terminée', 'Le chauffeur ne t’a pas trouvé et est reparti.'] },
  { path: 'finish', to: 'terminee', notification: ['course_terminee_noter', 'Course terminée', 'Note ton chauffeur.'] },
  { path: 'driver-cancel', to: 'annulee_chauffeur', notification: ['reservation_annulee', 'Réservation annulée', 'Le chauffeur a annulé ta réservation.'] },
];

const actionRoute = ({ path, to, guard, notification: [type, titre, message] }: DriverAction): MockRoute => ({
  method: 'POST',
  pattern: `/reservations/:id/${path}`,
  handler: (ctx): Reservation => {
    const { reservation, trajet } = driverParties(ctx, idParam(ctx));
    guard?.(ctx, reservation, trajet);
    transition(reservation, to, ctx.now);
    syncTripStatus(ctx.db, trajet);
    notify(ctx.db, ctx.now, reservation.passagerId, type, titre, message, { reservationId: reservation.id, trajetId: trajet.id });
    return reservation;
  },
});

/** A planned trip leaves: the driver goes online at the start of the path. */
function depart(ctx: RequestContext): Trajet {
  const user = requireUser(ctx);
  const trajet = findOr404(ctx.db.trajets, (t) => t.id === idParam(ctx), 'Trajet');
  if (trajet.chauffeurId !== user.id) throw new HttpError(403, 'Seul le chauffeur peut démarrer ce trajet.');
  if (trajet.statut !== 'publie') throw new HttpError(409, 'Ce trajet est déjà parti ou terminé.');
  trajet.statut = 'en_route';
  const [longitude, latitude] = trajet.chemin[0];
  ctx.db.positions = ctx.db.positions.filter((p) => p.chauffeurId !== user.id);
  ctx.db.positions.push({ chauffeurId: user.id, trajetId: trajet.id, enLigne: true, latitude, longitude, dateMiseAJour: iso(ctx.now) });
  return trajet;
}

const TRACKED: readonly StatutReservation[] = ['acceptee', 'chauffeur_sur_place', 'en_course'];

/** Approach screen, for both sides (contract: SuiviReservation). Polled every 5 s like the live position. */
function tracking(ctx: RequestContext): SuiviReservation {
  const { reservation, trajet } = reservationParties(ctx, idParam(ctx));
  if (!TRACKED.includes(reservation.statut)) throw new HttpError(409, 'Aucun suivi pour cette réservation.');
  const chauffeur = userById(ctx, trajet.chauffeurId);
  const passager = userById(ctx, reservation.passagerId);
  const position = findOr404(ctx.db.positions, (p) => p.chauffeurId === chauffeur.id, 'Position du chauffeur');
  const left = approach(ctx.db, trajet, reservation.priseEnCharge, ctx.now);
  return {
    reservation,
    trajet,
    chauffeur: { ...toPublicProfile(chauffeur), telephone: chauffeur.telephone },
    passager: { ...toPublicProfile(passager), telephone: passager.telephone },
    vehicule: findOr404(ctx.db.vehicules, (v) => v.id === trajet.vehiculeId, 'Véhicule'),
    positionChauffeur: position,
    cheminVersPassager: left?.cheminVersPassager ?? [],
    arriveeDansMinutes: left ? Math.ceil(left.secondes / 60) : 0,
    distanceMetres: left?.distanceMetres ?? 0,
  };
}

export const rideRoutes: MockRoute[] = [
  { method: 'GET', pattern: '/reservations/:id/tracking', handler: tracking },
  ...ACTIONS.map(actionRoute),
  {
    method: 'POST',
    pattern: '/reservations/:id/extend-wait',
    handler: (ctx): Reservation => {
      const { reservation, trajet } = driverParties(ctx, idParam(ctx));
      extendWait(reservation);
      notify(ctx.db, ctx.now, reservation.passagerId, 'attente_prolongee', 'Attente prolongée', 'Le chauffeur t’attend 5 minutes de plus.', {
        reservationId: reservation.id,
        trajetId: trajet.id,
      });
      return reservation;
    },
  },
  { method: 'POST', pattern: '/trips/:id/depart', handler: depart },
];
