import type { Reservation, StatutReservation, Trajet } from '@contract';

import { isNearPickup } from '@/features/bookings/rules';
import { indexAtFraction, nearestPointIndex, type LngLat } from '@/shared/map';
import { queryClient } from '@/shared/query';
import { advanceClock, currentTime, setClockSpeed } from '@/shared/utils';

import { autoReply } from '../mock/autoReply';
import { getDb, saveDb } from '../mock/db';
import { refreshDerived } from '../mock/derived';
import { approach } from '../mock/drive';
import { DEMO_POSITION } from '../mock/places';
import { copyOut, dispatch } from '../mock/request';
import { canTransition } from '../mock/reservationFlow';
import type { HttpMethod } from '../mock/server';
import { toLieu, toLngLat } from '../mock/tripGeo';
import type { MockDb } from '../mock/types';
import { sessionStore } from '../session/sessionStore';
import { AUTO_ACCEPT_RANGE, demoStore } from './demoStore';

/**
 * The demo engine: plays "the other person" (driver or passenger) for the demo
 * panel. Every action goes through the simulated API routes, as that person,
 * so the screens see exactly what the real server would send them.
 * Nothing runs on a timer: movement and expiry follow the clock.
 */

const FINAL: readonly StatutReservation[] = ['refusee', 'expiree', 'terminee', 'absent', 'annulee_passager', 'annulee_chauffeur'];

/** What the panel shows: the demo user's current reservation, seen from the server. */
export interface DemoFocus {
  reservation: Reservation;
  trajet: Trajet;
  /** The demo user's side; the engine plays the other one. */
  side: 'passager' | 'chauffeur';
  distanceMetres: number | null;
  arriveeDansSecondes: number | null;
  nearPickup: boolean;
  /** Live car position (null when the driver is offline). */
  driverPosition: LngLat | null;
  pickup: LngLat;
}

const me = (): number => {
  const { userId } = sessionStore.getState();
  if (userId === null) throw new Error('Connecte-toi d’abord (écran Contrôle).');
  return userId;
};

/** Cheap fingerprint of what a refresh can change on its own (car stops, expiries). */
const changeMark = (db: MockDb): string => JSON.stringify([db.drives, db.reservations.map((r) => r.statut)]);

/** Most recent reservation of the demo user (even finished, so the panel shows the outcome). */
export async function getFocus(): Promise<DemoFocus | null> {
  const db = await getDb();
  const userId = me();
  const now = currentTime();
  const before = changeMark(db);
  autoReply(db, now, dispatch); // the simulated driver answers even if no app screen is open
  refreshDerived(db, now); // same view as any GET: expiry and positions up to date
  if (changeMark(db) !== before) await saveDb();
  const mine = db.reservations
    .filter((r) => r.passagerId === userId || db.trajets.some((t) => t.id === r.trajetId && t.chauffeurId === userId))
    .sort((a, b) => b.dateDemande.localeCompare(a.dateDemande) || b.id - a.id);
  const reservation = mine[0];
  if (!reservation) return null;
  const trajet = db.trajets.find((t) => t.id === reservation.trajetId);
  if (!trajet) return null;
  const left = approach(db, trajet, reservation.priseEnCharge, now);
  const position = db.positions.find((p) => p.chauffeurId === trajet.chauffeurId && p.enLigne);
  return copyOut<DemoFocus>({
    reservation,
    trajet,
    side: reservation.passagerId === userId ? 'passager' : 'chauffeur',
    distanceMetres: left?.distanceMetres ?? null,
    arriveeDansSecondes: left?.secondes ?? null,
    nearPickup: left !== null && isNearPickup(left.distanceMetres),
    driverPosition: position ? toLngLat(position) : null,
    pickup: toLngLat(reservation.priseEnCharge),
  });
}

/** One call to the simulated API as another user, then every screen refetches. */
async function actAs(userId: number, method: HttpMethod, path: string, body?: unknown): Promise<void> {
  const db = await getDb();
  dispatch(db, currentTime(), userId, method, path, body);
  await saveDb();
  await queryClient.invalidateQueries();
}

/* The simulated driver (the demo user is the passenger). */

export const driverAccepts = (f: DemoFocus) => actAs(f.trajet.chauffeurId, 'POST', `/reservations/${f.reservation.id}/accept`);
export const driverRefuses = (f: DemoFocus, motif: string) =>
  actAs(f.trajet.chauffeurId, 'POST', `/reservations/${f.reservation.id}/refuse`, { motif });
export const driverDeparts = (f: DemoFocus) => actAs(f.trajet.chauffeurId, 'POST', `/trips/${f.trajet.id}/depart`);
export const driverArrives = (f: DemoFocus) => actAs(f.trajet.chauffeurId, 'POST', `/reservations/${f.reservation.id}/arrived`);
export const driverExtendsWait = (f: DemoFocus) => actAs(f.trajet.chauffeurId, 'POST', `/reservations/${f.reservation.id}/extend-wait`);
export const driverStarts = (f: DemoFocus) => actAs(f.trajet.chauffeurId, 'POST', `/reservations/${f.reservation.id}/start`);
export const driverMarksAbsent = (f: DemoFocus) => actAs(f.trajet.chauffeurId, 'POST', `/reservations/${f.reservation.id}/no-show`);
export const driverFinishes = (f: DemoFocus) => actAs(f.trajet.chauffeurId, 'POST', `/reservations/${f.reservation.id}/finish`);
export const driverCancels = (f: DemoFocus) => actAs(f.trajet.chauffeurId, 'POST', `/reservations/${f.reservation.id}/driver-cancel`);

/* The simulated passenger (the demo user is the driver). */

export const passengerCancels = (f: DemoFocus) => actAs(f.reservation.passagerId, 'POST', `/reservations/${f.reservation.id}/cancel`);

/** A simulated passenger asks for a seat on the demo user's trip (pickup at 25 %, drop at 75 % of the path). */
export async function passengerRequests(): Promise<void> {
  const db = await getDb();
  const userId = me();
  const trajet = db.trajets
    .filter((t) => t.chauffeurId === userId && (t.statut === 'publie' || t.statut === 'en_route') && t.placesLibres > 0)
    .sort((a, b) => b.dateDepart.localeCompare(a.dateDepart))[0];
  if (!trajet) throw new Error('Publie d’abord un trajet avec des places libres.');
  const busy = new Set(db.reservations.filter((r) => r.trajetId === trajet.id && !FINAL.includes(r.statut)).map((r) => r.passagerId));
  const passenger = db.utilisateurs.find(
    (u) => u.id !== userId && !busy.has(u.id) && (!trajet.reserveFemmes || u.sexe === 'femme'),
  );
  if (!passenger) throw new Error('Aucun passager simulé disponible pour ce trajet.');
  await actAs(passenger.id, 'POST', '/reservations', {
    trajetId: trajet.id,
    places: 1,
    priseEnCharge: toLieu(trajet.chemin[indexAtFraction(trajet.chemin, 0.25)], 'Point de prise en charge'),
    depose: toLieu(trajet.chemin[indexAtFraction(trajet.chemin, 0.75)], 'Point de dépose'),
  });
}

/* The demo user himself (until the booking screens exist, R12 to R17). */

/** Test booking: the demo user books a seat, from Analakely, on the first car passing by. */
export async function createTestBooking(): Promise<void> {
  const db = await getDb();
  const userId = me();
  const around = dispatch(db, currentTime(), userId, 'GET', `/trips/around?latitude=${DEMO_POSITION.latitude}&longitude=${DEMO_POSITION.longitude}`);
  const trajet = Array.isArray(around) ? (around[0] as Trajet | undefined) : undefined;
  if (!trajet) throw new Error('Aucune voiture ne passe près d’Analakely en ce moment.');
  const pickup = nearestPointIndex(trajet.chemin, toLngLat(DEMO_POSITION)).index;
  const drop = Math.max(pickup + 1, indexAtFraction(trajet.chemin, 0.95));
  await actAs(userId, 'POST', '/reservations', {
    trajetId: trajet.id,
    places: 1,
    priseEnCharge: toLieu(trajet.chemin[pickup], DEMO_POSITION.libelle),
    depose: toLieu(trajet.chemin[drop], 'Point de dépose'),
  });
}

/* Time jumps: same clock for everyone, so countdowns and the car stay in step. */

/** Jumps the clock to when the car reaches the pickup point (it stops there). */
export async function skipToPickup(f: DemoFocus): Promise<void> {
  if (f.arriveeDansSecondes === null) throw new Error('La voiture n’est pas en route vers ce point.');
  if (f.arriveeDansSecondes > 0) advanceClock(f.arriveeDansSecondes * 1000 + 1000);
  await queryClient.invalidateQueries();
}

/** Jumps the clock to the end of the 15 min wait (or of the 3 min answer delay). */
export async function skipWait(f: DemoFocus): Promise<void> {
  const end = f.reservation.statut === 'en_attente' ? f.reservation.dateExpiration : f.reservation.finAttente;
  if (end === null) throw new Error('Aucune attente en cours.');
  const ms = new Date(end).getTime() - currentTime().getTime();
  if (ms > 0) advanceClock(ms + 1000);
  await queryClient.invalidateQueries();
}

/* Settings (saved in demoStore). */

export const setDemoSpeed = (speed: number): void => setClockSpeed(speed);

export function setAutoAccept(autoAccept: boolean): void {
  demoStore.setState({ autoAccept }); // with persist, setState may return a promise: block body
}

export function setAutoAcceptSeconds(seconds: number): void {
  const [min, max] = AUTO_ACCEPT_RANGE;
  demoStore.setState({ autoAcceptSeconds: Math.min(Math.max(Math.round(seconds), min), max) });
}

/** Panel buttons follow the same transition table as the server: a button shows only if the move is allowed. */
export const allowed = (f: DemoFocus, to: StatutReservation): boolean => canTransition(f.reservation.statut, to);
