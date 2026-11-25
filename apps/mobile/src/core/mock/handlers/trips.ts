import type { Chemin, DemandeRecherche, PositionChauffeur, ResultatRecherche, Trajet } from '@contract';

import { haversineMeters, type LngLat } from '@/shared/map';
import { addMinutes, isRecord } from '@/shared/utils';

import { approach } from '../drive';
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
import { nearestIndex, segmentSeconds, toLieu, toLngLat } from '../tripGeo';
import { nextId } from '../types';
import { toPublicProfile, toVehicleSummary, userById } from '../views';

/** How far a passenger walks to or from the driver's road. */
const MAX_WALK_METRES = 800;
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
    if (trajet.chauffeurId === user.id || trajet.placesLibres < demande.places) return;
    if (trajet.reserveFemmes && user.sexe !== 'femme') return;
    if (demande.femmesSeulement && !trajet.reserveFemmes) return;
    if (!inTimeWindow(trajet, demande.quand, ctx.now)) return;

    const pickup = nearestIndex(trajet, demande.depart);
    const drop = nearestIndex(trajet, demande.destination);
    if (pickup.distanceMeters > MAX_WALK_METRES || drop.distanceMeters > MAX_WALK_METRES || drop.index <= pickup.index) return;

    let arriveeDansMinutes: number | null = null;
    let heurePassage: string | null = null;
    const position = ctx.db.positions.find((p) => p.trajetId === trajet.id && p.enLigne);
    if (trajet.statut === 'en_route' && position) {
      const [longitude, latitude] = trajet.chemin[pickup.index];
      const left = approach(ctx.db, trajet, { longitude, latitude }, ctx.now);
      if (!left) return; // already passed the passenger
      arriveeDansMinutes = Math.max(1, Math.ceil(left.secondes / 60));
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
  if (user.statutChauffeur !== 'valide') throw new HttpError(403, 'Ton compte chauffeur n’est pas encore validé.');
  const vehicule = ctx.db.vehicules.find((v) => v.utilisateurId === user.id && v.parDefaut && v.statut === 'valide');
  if (!vehicule) throw new HttpError(409, 'Aucun véhicule validé.');

  const type = requireOneOf(ctx.body, 'type', ['immediat', 'a_l_avance'] as const);
  const placesTotal = Math.round(requireNumber(ctx.body, 'placesTotal'));
  if (placesTotal < 1 || placesTotal > vehicule.places) throw new HttpError(400, `Entre 1 et ${vehicule.places} place(s).`);
  const distanceMetres = Math.round(requireNumber(ctx.body, 'distanceMetres'));
  const dateDepart = type === 'immediat' ? iso(ctx.now) : requireString(ctx.body, 'dateDepart');
  if (type === 'a_l_avance' && new Date(dateDepart) <= ctx.now) throw new HttpError(400, 'Choisis une heure de départ à venir.');

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

/** Passenger home: trips on the road now whose path passes near the given point. */
function around(ctx: RequestContext): Trajet[] {
  const user = requireUser(ctx);
  const point = { latitude: Number(ctx.query.latitude), longitude: Number(ctx.query.longitude) };
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) throw new HttpError(400, 'Position invalide.');
  return ctx.db.trajets.filter(
    (t) =>
      t.statut === 'en_route' &&
      t.chauffeurId !== user.id &&
      t.placesLibres > 0 &&
      (!t.reserveFemmes || user.sexe === 'femme') &&
      nearestIndex(t, point).distanceMeters <= MAX_WALK_METRES,
  );
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
