import type { Badge, StatutReservation, Utilisateur } from '@contract';

import { notify } from './notify';
import { iso } from './time';
import type { MockDb } from './types';

/** Statuses that hold seats in the car. */
export const SEAT_HOLDING: readonly StatutReservation[] = ['acceptee', 'chauffeur_sur_place', 'en_course', 'terminee'];

const NEW_ACCOUNT_DAYS = 14;

/**
 * Badge computed by the server. GAP #2 (sent to the backend): 'top' exists in the
 * contract but is not displayed; the simulation never produces it, and the app
 * must treat it as 'verifie' if the real API sends it.
 */
function badgeOf(user: Utilisateur, now: Date): Badge {
  const ageDays = (now.getTime() - new Date(user.dateCreation).getTime()) / 86_400_000;
  if (ageDays < NEW_ACCOUNT_DAYS) return 'nouveau';
  return user.statutChauffeur === 'valide' ? 'verifie' : 'non_verifie';
}

/** Expires unanswered requests (3 min rule), lazily, like a server job would. */
function expireRequests(db: MockDb, now: Date): void {
  db.reservations.forEach((reservation) => {
    if (reservation.statut !== 'en_attente' || new Date(reservation.dateExpiration) > now) return;
    reservation.statut = 'expiree';
    reservation.dateReponse = iso(now);
    notify(db, now, reservation.passagerId, 'demande_expiree', 'Pas de réponse', 'Le chauffeur n’a pas répondu à temps. Tu peux relancer ou choisir un autre chauffeur.', {
      reservationId: reservation.id,
      trajetId: reservation.trajetId,
    });
  });
}

/** Recomputes every derived field so the data always agrees with itself. */
export function refreshDerived(db: MockDb, now: Date): void {
  expireRequests(db, now);

  db.trajets.forEach((trajet) => {
    const taken = db.reservations
      .filter((r) => r.trajetId === trajet.id && SEAT_HOLDING.includes(r.statut))
      .reduce((sum, r) => sum + r.places, 0);
    trajet.placesLibres = Math.max(0, trajet.placesTotal - taken);
  });

  db.utilisateurs.forEach((user) => {
    const notes = db.avis.filter((a) => a.cibleId === user.id).map((a) => a.note);
    user.nombreNotes = notes.length;
    user.noteMoyenne = notes.length ? Math.round((notes.reduce((s, n) => s + n, 0) / notes.length) * 10) / 10 : null;
    user.coursesPassager = db.reservations.filter((r) => r.passagerId === user.id && r.statut === 'terminee').length;
    user.coursesChauffeur = db.trajets.filter(
      (t) => t.chauffeurId === user.id && t.statut === 'termine' && db.reservations.some((r) => r.trajetId === t.id && r.statut === 'terminee'),
    ).length;
    user.badge = badgeOf(user, now);
  });
}
