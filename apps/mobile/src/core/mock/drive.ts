import type { Chemin, Lieu, Position, Reservation, Trajet } from '@contract';

import { isNearPickup } from '@/features/bookings/rules';
import { metersAlong, pathLengthMeters, pointAlong } from '@/shared/map';

import { iso } from './time';
import { toLngLat } from './tripGeo';
import type { Drive, MockDb } from './types';

/**
 * Simulated driving. A driver's place on the path is a function of time:
 * metres = anchor + speed × (now − anchorAt), capped at the next stop.
 * Nothing counts tick by tick, so the position is right after the app comes
 * back from the background, and a sped-up clock moves the car faster.
 */

const MOVING: readonly Trajet['statut'][] = ['en_route', 'en_cours'];

/** Average speed of the real Mapbox route (path metres per second). */
function speedOf(trajet: Trajet): number {
  const length = pathLengthMeters(trajet.chemin);
  return trajet.dureeSecondes > 0 ? length / trajet.dureeSecondes : 0;
}

const metresOf = (trajet: Trajet, point: Position): number => metersAlong(trajet.chemin, toLngLat(point));

function metresAt(trajet: Trajet, drive: Drive, now: Date): number {
  const elapsedS = Math.max(0, (now.getTime() - new Date(drive.anchorAt).getTime()) / 1000);
  return Math.min(drive.anchorMetres + speedOf(trajet) * elapsedS, drive.capMetres);
}

/** Next stop ahead: a pickup to make or a passenger to drop. The car waits there. */
function nextStop(db: MockDb, trajet: Trajet, fromMetres: number): number {
  const stops = db.reservations
    .filter((r) => r.trajetId === trajet.id)
    .flatMap((r): Lieu[] => {
      if (r.statut === 'acceptee' || r.statut === 'chauffeur_sur_place') return [r.priseEnCharge];
      if (r.statut === 'en_course') return [r.depose];
      return [];
    })
    .map((lieu) => metresOf(trajet, lieu))
    .filter((m) => m >= fromMetres - 1);
  return Math.min(pathLengthMeters(trajet.chemin), ...stops);
}

function startDrive(db: MockDb, trajet: Trajet, now: Date): Drive {
  const position = db.positions.find((p) => p.trajetId === trajet.id);
  const anchorMetres = position ? metresOf(trajet, position) : 0;
  return { anchorAt: iso(now), anchorMetres, capMetres: anchorMetres, nearPickup: [] };
}

/** Road distance and time from the driver to a point of the path; null if already passed. */
export function approach(db: MockDb, trajet: Trajet, target: Position, now: Date): { distanceMetres: number; secondes: number; cheminVersPassager: Chemin } | null {
  const drive = db.drives[trajet.id];
  const position = db.positions.find((p) => p.trajetId === trajet.id && p.enLigne);
  if (!drive && !position) return null;
  const from = drive ? metresAt(trajet, drive, now) : metresOf(trajet, position as Position);
  const to = metresOf(trajet, target);
  if (to < from - 1) return null;
  const geometric = Math.max(0, to - from);
  const speed = speedOf(trajet);
  const roadScale = trajet.distanceMetres / Math.max(1, pathLengthMeters(trajet.chemin));
  return {
    distanceMetres: Math.round(geometric * roadScale),
    secondes: speed > 0 ? Math.round(geometric / speed) : 0,
    cheminVersPassager: slicePath(trajet.chemin, from, to),
  };
}

/** The part of the path between two distances, with exact end points. */
function slicePath(path: Chemin, from: number, to: number): Chemin {
  const middle: Chemin = [];
  let walked = 0;
  for (let i = 1; i < path.length && walked < to; i += 1) {
    walked += pathLengthMeters(path, i - 1, i);
    if (walked > from && walked < to) middle.push(path[i]);
  }
  return [pointAlong(path, from).point, ...middle, pointAlong(path, to).point];
}

/** Passing under the arrival radius (ARRIVAL_RADIUS_METRES) is recorded once per reservation (the moment the car crosses). */
function detectNearPickup(db: MockDb, trajet: Trajet, drive: Drive, now: Date): void {
  db.reservations
    .filter((r): r is Reservation => r.trajetId === trajet.id && r.statut === 'acceptee' && !drive.nearPickup.includes(r.id))
    .forEach((r) => {
      const left = approach(db, trajet, r.priseEnCharge, now);
      if (left && isNearPickup(left.distanceMetres)) drive.nearPickup.push(r.id);
    });
}

/** Moves every driver on the road to where the clock says, like the GPS pushes of the real app. */
export function advanceDrives(db: MockDb, now: Date): void {
  db.trajets.forEach((trajet) => {
    if (!MOVING.includes(trajet.statut)) {
      delete db.drives[trajet.id];
      return;
    }
    const drive = (db.drives[trajet.id] ??= startDrive(db, trajet, now));
    const current = metresAt(trajet, drive, now);
    const cap = nextStop(db, trajet, current);
    if (cap !== drive.capMetres) {
      // A stop was added or done: restart from here, so waiting time is not "driven" later.
      drive.anchorAt = iso(now);
      drive.anchorMetres = current;
      drive.capMetres = cap;
    }
    const [longitude, latitude] = pointAlong(trajet.chemin, current).point;
    const position = db.positions.find((p) => p.chauffeurId === trajet.chauffeurId);
    if (position) Object.assign(position, { trajetId: trajet.id, enLigne: true, latitude, longitude, dateMiseAJour: iso(now) });
    else db.positions.push({ chauffeurId: trajet.chauffeurId, trajetId: trajet.id, enLigne: true, latitude, longitude, dateMiseAJour: iso(now) });
    detectNearPickup(db, trajet, drive, now);
  });
}
