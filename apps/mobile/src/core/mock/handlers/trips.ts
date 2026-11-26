import type { Chemin, DemandeRecherche, PositionChauffeur, ResultatRecherche, Trajet } from '@contract';

import type { PassingDriver } from '@/features/trips/types';
import { ACTIVE_TRIP_STATUSES, MIN_TRIP_METRES, PUBLISH_MESSAGES as M, departureProblem, nearName, publishBlocker } from '@/features/trips/rules';
import { haversineMeters, type LngLat } from '@/shared/map';
import { addMinutes, isRecord } from '@/shared/utils';

import { arrivalAt, byRank, inSearchWindow, isOfferedTo, passingAt, pathSpan, pickupPoint, type RankKey } from '../matching';
import { quoteForTrip } from '../pricing';
import {
  HttpError,
  findOr404,
  idParam,
  optionalBoolean,
  optionalString,
  requireLieu,
  requireNumber,
  requireOneOf,
  requireString,
  requireUser,
  type MockRoute,
  type RequestContext,
} from '../server';
import { iso } from '../time';
import { toLieu, toLngLat } from '../tripGeo';
import { nextId } from '../types';
import { toPublicProfile, toVehicleSummary, userById } from '../views';

function parseDemande(body: unknown): DemandeRecherche {
  const quand = requireString(body, 'quand');
  if (quand !== 'maintenant' && Number.isNaN(new Date(quand).getTime())) throw new HttpError(400, 'quand invalide.');
  return {
    depart: requireLieu(body, 'depart'),
    destination: requireLieu(body, 'destination'),
    places: Math.max(1, Math.round(requireNumber(body, 'places'))),
    quand,
    femmesSeulement: optionalBoolean(body, 'femmesSeulement'),
  };
}

/**
 * Drivers whose path holds the passenger's departure THEN his destination (`pathSpan`),
 * with enough seats, passing his point in the wanted window; ordered by `byRank`.
 */
function search(ctx: RequestContext): ResultatRecherche[] {
  const user = requireUser(ctx);
  const demande = parseDemande(ctx.body);

  return ctx.db.trajets
    .flatMap((trajet): (RankKey & { result: ResultatRecherche })[] => {
      if (trajet.statut !== 'publie' && trajet.statut !== 'en_route') return [];
      if (!isOfferedTo(trajet, user, demande.places)) return [];
      if (demande.femmesSeulement && !trajet.reserveFemmes) return [];
      const span = pathSpan(trajet, demande.depart, demande.destination);
      const passing = span && passingAt(ctx.db, trajet, span.pickup, ctx.now);
      if (!span || !passing || !inSearchWindow(passing.minutes, demande.quand, ctx.now)) return [];

      const chauffeur = userById(ctx, trajet.chauffeurId);
      const vehicule = findOr404(ctx.db.vehicules, (v) => v.id === trajet.vehiculeId, 'Véhicule');
      const result: ResultatRecherche = {
        trajet,
        chauffeur: toPublicProfile(chauffeur),
        vehicule: toVehicleSummary(vehicule),
        priseEnCharge: toLieu(trajet.chemin[span.pickup], nearName(demande.depart.libelle)),
        depose: toLieu(trajet.chemin[span.drop], nearName(demande.destination.libelle)),
        arriveeDansMinutes: passing.arrival ? passing.minutes : null,
        heurePassage: passing.arrival ? null : iso(addMinutes(ctx.now, passing.minutes)),
        ...quoteForTrip(ctx.db, trajet, span.pickup, span.drop, demande.places),
      };
      return [{ minutes: passing.minutes, trajet, chauffeur, result }];
    })
    .sort(byRank)
    .map(({ result }) => result);
}

const isLngLat = (value: unknown): value is LngLat =>
  Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number';

function requireChemin(body: unknown): Chemin {
  const value = isRecord(body) ? body.chemin : undefined;
  if (!Array.isArray(value) || value.length < 2 || !value.every(isLngLat)) {
    throw new HttpError(400, 'Le tracé du trajet est invalide.');
  }
  return value.map(([lng, lat]) => [lng, lat]);
}

function publish(ctx: RequestContext): Trajet {
  const user = requireUser(ctx);
  const mine = ctx.db.vehicules.filter((v) => v.utilisateurId === user.id);
  const blocker = publishBlocker(user.statutChauffeur, mine);
  if (blocker === 'not_validated') throw new HttpError(403, M.notValidated);
  const vehicule = mine.find((v) => v.parDefaut && v.statut === 'valide');
  if (blocker || !vehicule) throw new HttpError(409, M.vehiclePending);

  const type = requireOneOf(ctx.body, 'type', ['immediat', 'a_l_avance'] as const);
  const placesTotal = Math.round(requireNumber(ctx.body, 'placesTotal'));
  if (placesTotal < 1 || placesTotal > vehicule.places) throw new HttpError(400, M.seatsInvalid(vehicule.places));
  const distanceMetres = Math.round(requireNumber(ctx.body, 'distanceMetres'));
  if (distanceMetres < MIN_TRIP_METRES) throw new HttpError(400, M.tooShort);
  const dateDepart = type === 'immediat' ? iso(ctx.now) : requireString(ctx.body, 'dateDepart');
  if (type === 'a_l_avance') {
    const departureMs = new Date(dateDepart).getTime();
    if (Number.isNaN(departureMs)) throw new HttpError(400, 'dateDepart invalide.');
    const problem = departureProblem(departureMs, ctx.now.getTime());
    if (problem) throw new HttpError(400, problem === 'past' ? M.pastDeparture : M.tooFarAhead);
  }
  const onRoad = ctx.db.trajets.some(
    (t) => t.chauffeurId === user.id && t.type === 'immediat' && ACTIVE_TRIP_STATUSES.includes(t.statut),
  );
  if (type === 'immediat' && onRoad) throw new HttpError(409, M.alreadyOnRoad);

  const trajet: Trajet = {
    id: nextId(ctx.db, 'trajet'),
    chauffeurId: user.id,
    vehiculeId: vehicule.id,
    type,
    statut: type === 'immediat' ? 'en_route' : 'publie',
    depart: requireLieu(ctx.body, 'depart'),
    arrivee: requireLieu(ctx.body, 'arrivee'),
    chemin: requireChemin(ctx.body),
    distanceMetres,
    dureeSecondes: Math.round(requireNumber(ctx.body, 'dureeSecondes')),
    dateDepart,
    placesTotal,
    placesLibres: placesTotal,
    dateAnnulation: null,
    dateFin: null,
    reserveFemmes: user.sexe === 'femme' && optionalBoolean(ctx.body, 'reserveFemmes'),
  };
  ctx.db.trajets.push(trajet);

  if (type === 'immediat') {
    const [longitude, latitude] = trajet.chemin[0];
    ctx.db.positions = ctx.db.positions.filter((p) => p.chauffeurId !== user.id);
    ctx.db.positions.push({ chauffeurId: user.id, trajetId: trajet.id, enLigne: true, latitude, longitude, dateMiseAJour: iso(ctx.now) });
  }
  return trajet;
}

/**
 * Passenger home: drivers on the road who will pass near the given point and still have
 * a seat, soonest first. A driver who has passed the point is never listed.
 */
function around(ctx: RequestContext): PassingDriver[] {
  const user = requireUser(ctx);
  const point = { latitude: Number(ctx.query.latitude), longitude: Number(ctx.query.longitude) };
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) throw new HttpError(400, 'Position invalide.');
  return ctx.db.trajets
    .flatMap((trajet): (RankKey & { driver: PassingDriver })[] => {
      if (trajet.statut !== 'en_route' || !isOfferedTo(trajet, user, 1)) return [];
      const pickup = pickupPoint(trajet, point);
      const arrival = pickup && arrivalAt(ctx.db, trajet, pickup.index, ctx.now);
      if (!pickup || !arrival) return [];
      const chauffeur = userById(ctx, trajet.chauffeurId);
      const vehicule = findOr404(ctx.db.vehicules, (v) => v.id === trajet.vehiculeId, 'Véhicule');
      const driver: PassingDriver = {
        trajet,
        chauffeur: toPublicProfile(chauffeur),
        vehicule: toVehicleSummary(vehicule),
        priseEnCharge: toLieu(trajet.chemin[pickup.index], 'Près de toi'),
        arriveeDansMinutes: arrival.minutes,
        positionChauffeur: arrival.positionChauffeur,
        cheminVersPassager: arrival.cheminVersPassager,
        cheminApresPassager: trajet.chemin.slice(pickup.index),
      };
      return [{ minutes: arrival.minutes, trajet, chauffeur, driver }];
    })
    .sort(byRank)
    .map(({ driver }) => driver);
}

export const tripsRoutes: MockRoute[] = [
  { method: 'POST', pattern: '/trips/search', handler: search },
  { method: 'POST', pattern: '/trips', handler: publish },
  { method: 'GET', pattern: '/trips/around', handler: around },
  {
    method: 'GET',
    pattern: '/me/trips',
    handler: (ctx): Trajet[] =>
      ctx.db.trajets
        .filter((t) => t.chauffeurId === requireUser(ctx).id)
        .sort((a, b) => b.dateDepart.localeCompare(a.dateDepart)),
  },
  { method: 'GET', pattern: '/trips/:id', handler: (ctx): Trajet => findOr404(ctx.db.trajets, (t) => t.id === idParam(ctx), 'Trajet') },
  {
    method: 'GET',
    pattern: '/drivers/nearby',
    handler: (ctx): PositionChauffeur[] => {
      requireUser(ctx);
      const center: LngLat = [Number(ctx.query.longitude), Number(ctx.query.latitude)];
      if (!center.every(Number.isFinite)) throw new HttpError(400, 'Position invalide.');
      const radius = Number(optionalString(ctx.query, 'rayonMetres') ?? 3000);
      return ctx.db.positions.filter((p) => p.enLigne && haversineMeters(toLngLat(p), center) <= radius);
    },
  },
];
