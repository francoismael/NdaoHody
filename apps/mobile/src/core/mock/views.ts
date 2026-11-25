import type { ProfilPublic, ResultatRecherche, Utilisateur, Vehicule } from '@contract';

import { HttpError, findOr404, type RequestContext } from './server';

/** What others see of a user: never the phone number. */
export const toPublicProfile = (user: Utilisateur): ProfilPublic => ({
  id: user.id,
  prenom: user.prenom ?? '',
  photoUrl: user.photoUrl,
  badge: user.badge,
  noteMoyenne: user.noteMoyenne,
  nombreNotes: user.nombreNotes,
});

export const toVehicleSummary = (vehicule: Vehicule): ResultatRecherche['vehicule'] => ({
  type: vehicule.type,
  marque: vehicule.marque,
  modele: vehicule.modele,
  couleur: vehicule.couleur,
  immatriculation: vehicule.immatriculation,
});

export const userById = (ctx: RequestContext, id: number): Utilisateur =>
  findOr404(ctx.db.utilisateurs, (u) => u.id === id, 'Utilisateur');

/** The driver and the passenger of a reservation; anyone else gets a 403. */
export function reservationParties(ctx: RequestContext, reservationId: number) {
  const reservation = findOr404(ctx.db.reservations, (r) => r.id === reservationId, 'Réservation');
  const trajet = findOr404(ctx.db.trajets, (t) => t.id === reservation.trajetId, 'Trajet');
  if (ctx.userId !== reservation.passagerId && ctx.userId !== trajet.chauffeurId) {
    throw new HttpError(403, 'Cette réservation ne te concerne pas.');
  }
  return { reservation, trajet, passagerId: reservation.passagerId, chauffeurId: trajet.chauffeurId };
}

/** Same as reservationParties, but only the trip's driver may act. */
export function driverParties(ctx: RequestContext, reservationId: number) {
  const parties = reservationParties(ctx, reservationId);
  if (ctx.userId !== parties.chauffeurId) throw new HttpError(403, 'Seul le chauffeur peut faire cette action.');
  return parties;
}
