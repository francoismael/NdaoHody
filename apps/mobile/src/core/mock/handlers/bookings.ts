import type { Conversation, DemandeReservation, Reservation, Trajet } from '@contract';

import { ACTIVE_BOOKING_STATUSES, ANSWER_DELAY_MINUTES, pathSpanMessage } from '@/features/bookings/rules';
import type { PriceQuote } from '@/features/pricing/types';
import { PICKUP_MAX_WALK_METRES } from '@/features/trips/rules';
import { addMinutes } from '@/shared/utils';

import { refreshDerived } from '../derived';
import { notify } from '../notify';
import { passingAt, pathSpanOrProblem } from '../matching';
import { HttpError, findOr404, idParam, requireLieu, requireNumber, requireString, requireUser, type MockRoute, type RequestContext } from '../server';
import { iso } from '../time';
import { nextId } from '../types';
import { transition } from '../reservationFlow';
import { driverParties, reservationParties, toSearchResult, userById } from '../views';

/** Back setting `relances_max`: a passenger re-sends an expired request 2 times at most. */
const MAX_RETRIES = 2;

/** Back BOOKABLE_STATUSES: trips a passenger can still book. */
const BOOKABLE: readonly Trajet['statut'][] = ['publie', 'en_route', 'en_cours'];


type BookingWish = Pick<DemandeReservation, 'places' | 'priseEnCharge' | 'depose'>;

const readWish = (body: unknown): BookingWish => ({
  places: Math.max(1, Math.round(requireNumber(body, 'places'))),
  priseEnCharge: requireLieu(body, 'priseEnCharge'),
  depose: requireLieu(body, 'depose'),
});

/**
 * Same checks as the back (RequestBookingUseCase), then the frozen price of the passenger's part.
 * The pickup and drop the passenger chose are moved onto the driver's path (same 800 m rule as
 * the home and the search: core/mock/matching.ts), seen as a search result for this trip.
 * Shared by the quote (GAP #15) and the request.
 */
function priceWish(ctx: RequestContext, trajet: Trajet, wish: BookingWish): PriceQuote {
  const passager = requireUser(ctx);
  if (trajet.reserveFemmes && passager.sexe !== 'femme') throw new HttpError(403, 'Ce trajet est réservé aux femmes.');
  if (trajet.chauffeurId === passager.id) throw new HttpError(400, 'Tu ne peux pas réserver ton propre trajet.');
  if (!BOOKABLE.includes(trajet.statut)) throw new HttpError(409, 'Ce trajet est terminé ou annulé.');
  if (wish.places > trajet.placesLibres) throw new HttpError(409, `Il ne reste que ${trajet.placesLibres} place(s) sur ce trajet.`);

  const span = pathSpanOrProblem(trajet, wish.priseEnCharge, wish.depose);
  if (typeof span === 'string') throw new HttpError(400, pathSpanMessage(span, PICKUP_MAX_WALK_METRES));
  const passing = passingAt(ctx.db, trajet, span.pickup, ctx.now);
  if (!passing) throw new HttpError(409, 'Le chauffeur est déjà passé à ton point de prise en charge.');
  const result = toSearchResult(ctx, trajet, span, passing, { depart: wish.priseEnCharge, destination: wish.depose }, wish.places);
  return { ...result, positionChauffeur: passing.arrival?.positionChauffeur ?? null };
}

/** Retries already made in the chain ending with `reservation` (back: countRetries). */
function retriesOf(ctx: RequestContext, reservation: Reservation): number {
  let count = 0;
  let previous = reservation.relanceDe;
  while (previous !== null) {
    count += 1;
    const id = previous;
    previous = ctx.db.reservations.find((r) => r.id === id)?.relanceDe ?? null;
  }
  return count;
}

function createReservation(ctx: RequestContext, trajet: Trajet, wish: BookingWish, relanceDe: number | null): Reservation {
  const passager = requireUser(ctx);
  const { distanceMetres, prixParPlace, prixTotal, priseEnCharge, depose } = priceWish(ctx, trajet, wish);
  // Never two requests at once: a double tap (or a replayed call) gets a 409, not a second booking.
  const active = ctx.db.reservations.some((r) => r.trajetId === trajet.id && r.passagerId === passager.id && ACTIVE_BOOKING_STATUSES.includes(r.statut));
  if (active) throw new HttpError(409, 'Tu as déjà une demande en cours sur ce trajet.');

  const reservation: Reservation = {
    id: nextId(ctx.db, 'reservation'),
    trajetId: trajet.id,
    passagerId: passager.id,
    places: wish.places,
    distanceMetres,
    prixParPlace,
    prixTotal,
    priseEnCharge, // on the path
    depose,
    statut: 'en_attente',
    relanceDe,
    dateDemande: iso(ctx.now),
    dateExpiration: iso(addMinutes(ctx.now, ANSWER_DELAY_MINUTES)),
    dateReponse: null,
    dateSurPlace: null,
    finAttente: null,
    prolongations: 0,
    dateDebutCourse: null,
    dateFinCourse: null,
    dateAnnulation: null,
  };
  ctx.db.reservations.push(reservation);
  notify(ctx.db, ctx.now, trajet.chauffeurId, 'nouvelle_demande', 'Nouvelle demande', `${passager.prenom ?? 'Un passager'} demande ${wish.places} place(s). Réponds dans les ${ANSWER_DELAY_MINUTES} minutes.`, {
    reservationId: reservation.id,
    trajetId: trajet.id,
  });
  return reservation;
}

const tripOf = (ctx: RequestContext): Trajet => findOr404(ctx.db.trajets, (t) => t.id === requireNumber(ctx.body, 'trajetId'), 'Trajet');

/** Only the trip's driver answers, and only a request still waiting. */
function pendingForDriver(ctx: RequestContext) {
  const parties = driverParties(ctx, idParam(ctx));
  if (parties.reservation.statut === 'expiree') throw new HttpError(409, 'La demande a expiré.');
  if (parties.reservation.statut !== 'en_attente') throw new HttpError(409, 'Cette demande a déjà une réponse.');
  return parties;
}

export const bookingsRoutes: MockRoute[] = [
  {
    method: 'POST',
    pattern: '/reservations',
    handler: (ctx): Reservation => createReservation(ctx, tripOf(ctx), readWish(ctx.body), null),
  },
  {
    method: 'POST',
    pattern: '/reservations/quote',
    handler: (ctx): PriceQuote => priceWish(ctx, tripOf(ctx), readWish(ctx.body)),
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
      transition(reservation, 'annulee_passager', ctx.now);
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
      if (retriesOf(ctx, reservation) >= MAX_RETRIES) {
        throw new HttpError(429, `Tu as déjà relancé ce chauffeur ${MAX_RETRIES} fois. Cherche un autre chauffeur.`);
      }
      return createReservation(ctx, trajet, reservation, reservation.id);
    },
  },
  {
    method: 'POST',
    pattern: '/reservations/:id/accept',
    handler: (ctx): Reservation => {
      const { reservation, trajet } = pendingForDriver(ctx);
      if (trajet.placesLibres < reservation.places) throw new HttpError(409, 'Plus assez de places libres.');
      transition(reservation, 'acceptee', ctx.now);
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
      transition(reservation, 'refusee', ctx.now);
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
