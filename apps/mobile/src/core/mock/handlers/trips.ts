import type { Chemin, DemandeRecherche, PositionChauffeur, ResultatRecherche, Trajet } from '@contract';

import type { PassingDriver } from '@/features/trips/types';
import { ACTIVE_TRIP_STATUSES, MIN_TRIP_METRES, PUBLISH_MESSAGES as M, departureProblem, publishBlocker } from '@/features/trips/rules';
import { haversineMeters, type LngLat } from '@/shared/map';
import { addMinutes, isRecord } from '@/shared/utils';

import { arrivalAt, bySoonestArrival, isOfferedTo, pickupPoint } from '../matching';
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
import { segmentSeconds, toLieu, toLngLat } from '../tripGeo';
import { nextId } from '../types';
import { toPublicProfile, toVehicleSummary, userById } from '../views';

/** A planned trip matches a search if it leaves in this window around the wanted time. */
const WINDOW_BEFORE_MIN = 30;
const WINDOW_AFTER_MIN = 120;

function parseDemande(body: unknown): DemandeRecherche {
  return {
    depart: requireLieu(body, 'depart'),
    destination: requireLieu(body, 'destination'),
    places: Math.max(1, Math.round(requireNumber(body, 'places'))),
    quand: requireString(body, 'quand'),
    femmesSeulement: optionalBoolean(body, 'femmesSeulement'),
  };
}

function inTimeWindow(trajet: Trajet, quand: string, now: Date): boolean {
  if (quand === 'maintenant') {
    return trajet.type === 'immediat' || new Date(trajet.dateDepart) <= addMinutes(now, 60);
  }
  const wanted = new Date(quand);
  const departure = new Date(trajet.dateDepart);
  return departure >= addMinutes(wanted, -WINDOW_BEFORE_MIN) && departure <= addMinutes(wanted, WINDOW_AFTER_MIN);
}

/** Order: rated drivers first (best rating, then most trips), then unrated ones (most trips). */
function compareDrivers(ctx: RequestContext) {
  return (a: ResultatRecherche, b: ResultatRecherche): number => {
    const noteA = a.chauffeur.noteMoyenne;
    const noteB = b.chauffeur.noteMoyenne;
    if (noteA !== null && noteB === null) return -1;
    if (noteA === null && noteB !== null) return 1;
    if (noteA !== null && noteB !== null && noteA !== noteB) return noteB - noteA;
    return userById(ctx, b.chauffeur.id).coursesChauffeur - userById(ctx, a.chauffeur.id).coursesChauffeur;
  };
}

function search(ctx: RequestContext): ResultatRecherche[] {
  const user = requireUser(ctx);
  const demande = parseDemande(ctx.body);
  const results: ResultatRecherche[] = [];

  ctx.db.trajets.forEach((trajet) => {
    if (trajet.statut !== 'publie' && trajet.statut !== 'en_route') return;
    if (!isOfferedTo(trajet, user, demande.places)) return;
    if (demande.femmesSeulement && !trajet.reserveFemmes) return;
    if (!inTimeWindow(trajet, demande.quand, ctx.now)) return;

    const pickup = pickupPoint(trajet, demande.depart);
    const drop = pickupPoint(trajet, demande.destination);
    if (!pickup || !drop || drop.index <= pickup.index) return;

    let arriveeDansMinutes: number | null = null;
    let heurePassage: string | null = null;
    const position = ctx.db.positions.find((p) => p.trajetId === trajet.id && p.enLigne);
    if (trajet.statut === 'en_route' && position) {
      const arrival = arrivalAt(ctx.db, trajet, pickup.index, ctx.now);
      if (!arrival) return; // already passed the passenger
      arriveeDansMinutes = arrival.minutes;
    } else {
      heurePassage = iso(new Date(new Date(trajet.dateDepart).getTime() + segmentSeconds(trajet, 0, pickup.index) * 1000));
    }

    const vehicule = findOr404(ctx.db.vehicules, (v) => v.id === trajet.vehiculeId, 'Véhicule');
    results.push({
      trajet,
      chauffeur: toPublicProfile(userById(ctx, trajet.chauffeurId)),
      vehicule: toVehicleSummary(vehicule),
      priseEnCharge: toLieu(trajet.chemin[pickup.index], `Près de ${demande.depart.libelle}`),
      depose: toLieu(trajet.chemin[drop.index], `Près de ${demande.destination.libelle}`),
      arriveeDansMinutes,
      heurePassage,
      ...quoteForTrip(ctx.db, trajet, pickup.index, drop.index, demande.places),
    });
  });

  return results.sort(compareDrivers(ctx));
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
    .flatMap((trajet): PassingDriver[] => {
      if (trajet.statut !== 'en_route' || !isOfferedTo(trajet, user, 1)) return [];
      const pickup = pickupPoint(trajet, point);
      const arrival = pickup && arrivalAt(ctx.db, trajet, pickup.index, ctx.now);
      if (!pickup || !arrival) return [];
      const vehicule = findOr404(ctx.db.vehicules, (v) => v.id === trajet.vehiculeId, 'Véhicule');
      return [
        {
          trajet,
          chauffeur: toPublicProfile(userById(ctx, trajet.chauffeurId)),
          vehicule: toVehicleSummary(vehicule),
          priseEnCharge: toLieu(trajet.chemin[pickup.index], 'Près de toi'),
          arriveeDansMinutes: arrival.minutes,
          positionChauffeur: arrival.positionChauffeur,
          cheminVersPassager: arrival.cheminVersPassager,
        },
      ];
    })
    .sort(bySoonestArrival);
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
