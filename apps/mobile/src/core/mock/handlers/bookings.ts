import type { Conversation, Reservation, Trajet } from '@contract';

import { addMinutes } from '@/shared/utils';

import { SEAT_HOLDING, refreshDerived } from '../derived';
import { notify } from '../notify';
import { totalPrice } from '../pricing';
import { HttpError, findOr404, idParam, requireLieu, requireNumber, requireString, requireUser, type MockRoute, type RequestContext } from '../server';
import { iso } from '../time';
import { nearestIndex, segmentMetres } from '../tripGeo';
import { nextId } from '../types';
import { reservationParties, userById } from '../views';

/** The driver has 3 minutes to answer (validated rule). */
const ANSWER_DELAY_MIN = 3;

function createReservation(ctx: RequestContext, trajet: Trajet, input: Pick<Reservation, 'places' | 'priseEnCharge' | 'depose'>, relanceDe: number | null): Reservation {
  const passager = requireUser(ctx);
  if (trajet.chauffeurId === passager.id) throw new HttpError(400, 'Tu ne peux pas réserver ton propre trajet.');
  if (trajet.statut !== 'publie' && trajet.statut !== 'en_route') throw new HttpError(409, 'Ce trajet n’est plus disponible.');
  if (trajet.placesLibres < input.places) throw new HttpError(409, 'Plus assez de places libres.');
  const active = ctx.db.reservations.some(
    (r) => r.trajetId === trajet.id && r.passagerId === passager.id && (r.statut === 'en_attente' || SEAT_HOLDING.includes(r.statut)),
  );
  if (active) throw new HttpError(409, 'Tu as déjà une réservation sur ce trajet.');

  const pickup = nearestIndex(trajet, input.priseEnCharge).index;
  const drop = nearestIndex(trajet, input.depose).index;
  if (drop <= pickup) throw new HttpError(400, 'La dépose doit être après la prise en charge.');

  const reservation: Reservation = {
    id: nextId(ctx.db, 'reservation'),
    trajetId: trajet.id,
    passagerId: passager.id,
    places: input.places,
    prixTotal: totalPrice(segmentMetres(trajet, pickup, drop), input.places),
    priseEnCharge: input.priseEnCharge,
    depose: input.depose,
    statut: 'en_attente',
    relanceDe,
    dateDemande: iso(ctx.now),
    dateExpiration: iso(addMinutes(ctx.now, ANSWER_DELAY_MIN)),
    dateReponse: null,
    dateSurPlace: null,
    finAttente: null,
    prolongations: 0,
    dateDebutCourse: null,
    dateFinCourse: null,
    dateAnnulation: null,
  };
  ctx.db.reservations.push(reservation);
  notify(ctx.db, ctx.now, trajet.chauffeurId, 'nouvelle_demande', 'Nouvelle demande', `${passager.prenom ?? 'Un passager'} demande ${input.places} place(s). Réponds dans les 3 minutes.`, {
    reservationId: reservation.id,
    trajetId: trajet.id,
  });
  return reservation;
}

/** Only the trip's driver answers, and only a request still waiting. */
function pendingForDriver(ctx: RequestContext) {
  const parties = reservationParties(ctx, idParam(ctx));
  if (ctx.userId !== parties.chauffeurId) throw new HttpError(403, 'Seul le chauffeur peut répondre.');
  if (parties.reservation.statut === 'expiree') throw new HttpError(409, 'La demande a expiré.');
  if (parties.reservation.statut !== 'en_attente') throw new HttpError(409, 'Cette demande a déjà une réponse.');
  return parties;
}

export const bookingsRoutes: MockRoute[] = [
  {
    method: 'POST',
    pattern: '/reservations',
    handler: (ctx): Reservation => {
      const trajet = findOr404(ctx.db.trajets, (t) => t.id === requireNumber(ctx.body, 'trajetId'), 'Trajet');
      return createReservation(
        ctx,
        trajet,
        {
          places: Math.max(1, Math.round(requireNumber(ctx.body, 'places'))),
          priseEnCharge: requireLieu(ctx.body, 'priseEnCharge'),
          depose: requireLieu(ctx.body, 'depose'),
        },
        null,
      );
    },
  },
  {
    method: 'GET',
    pattern: '/me/reservations',
    handler: (ctx): Reservation[] =>
      ctx.db.reservations
        .filter((r) => r.passagerId === requireUser(ctx).id)
        .sort((a, b) => b.dateDemande.localeCompare(a.dateDemande)),
  },
  {
    method: 'GET',
    pattern: '/me/requests',
    handler: (ctx): Reservation[] => {
      const myTrips = new Set(ctx.db.trajets.filter((t) => t.chauffeurId === requireUser(ctx).id).map((t) => t.id));
      return ctx.db.reservations.filter((r) => myTrips.has(r.trajetId) && r.statut === 'en_attente');
    },
  },
  { method: 'GET', pattern: '/reservations/:id', handler: (ctx): Reservation => reservationParties(ctx, idParam(ctx)).reservation },
  {
    method: 'POST',
    pattern: '/reservations/:id/cancel',
    handler: (ctx): Reservation => {
      const { reservation, chauffeurId } = reservationParties(ctx, idParam(ctx));
      if (ctx.userId !== reservation.passagerId) throw new HttpError(403, 'Seul le passager peut annuler sa demande.');
      // Validated rule: a passenger cancels only before the driver's answer.
      if (reservation.statut !== 'en_attente') throw new HttpError(409, 'Tu ne peux plus annuler : le chauffeur a déjà répondu.');
      reservation.statut = 'annulee_passager';
      reservation.dateAnnulation = iso(ctx.now);
      notify(ctx.db, ctx.now, chauffeurId, 'reservation_annulee', 'Demande annulée', 'Le passager a annulé sa demande.', { reservationId: reservation.id });
      return reservation;
    },
  },
  {
    method: 'POST',
    pattern: '/reservations/:id/retry',
    handler: (ctx): Reservation => {
      const { reservation, trajet } = reservationParties(ctx, idParam(ctx));
      if (reservation.statut !== 'expiree') throw new HttpError(409, 'Seule une demande expirée peut être relancée.');
      return createReservation(ctx, trajet, reservation, reservation.id);
    },
  },
  {
    method: 'POST',
    pattern: '/reservations/:id/accept',
    handler: (ctx): Reservation => {
      const { reservation, trajet } = pendingForDriver(ctx);
      if (trajet.placesLibres < reservation.places) throw new HttpError(409, 'Plus assez de places libres.');
      reservation.statut = 'acceptee';
      reservation.dateReponse = iso(ctx.now);
      if (!ctx.db.conversations.some((c) => c.reservationId === reservation.id)) {
        ctx.db.conversations.push({ id: nextId(ctx.db, 'conversation'), reservationId: reservation.id, messages: [] } satisfies Conversation);
      }
      const driverName = userById(ctx, trajet.chauffeurId).prenom ?? 'Le chauffeur';
      notify(ctx.db, ctx.now, reservation.passagerId, 'demande_acceptee', 'Réservation acceptée', `${driverName} a accepté ta demande.`, {
        reservationId: reservation.id,
        trajetId: trajet.id,
      });
      refreshDerived(ctx.db, ctx.now); // seats left go down at once
      return reservation;
    },
  },
  {
    method: 'POST',
    pattern: '/reservations/:id/refuse',
    handler: (ctx): Reservation => {
      const motif = requireString(ctx.body, 'motif');
      if (motif.length < 3) throw new HttpError(400, 'Indique un motif de refus.');
      const { reservation, trajet } = pendingForDriver(ctx);
      reservation.statut = 'refusee';
      reservation.dateReponse = iso(ctx.now);
      ctx.db.motifsRefus[reservation.id] = motif;
      notify(ctx.db, ctx.now, reservation.passagerId, 'demande_refusee', 'Demande refusée', `Motif : ${motif}`, { reservationId: reservation.id, trajetId: trajet.id });
      return reservation;
    },
  },
  {
    method: 'GET',
    pattern: '/reservations/:id/refusal-reason',
    handler: (ctx): { motif: string | null } => ({ motif: ctx.db.motifsRefus[reservationParties(ctx, idParam(ctx)).reservation.id] ?? null }),
  },
];
