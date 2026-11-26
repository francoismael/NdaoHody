import type { Lieu, ProfilPublic, ResultatRecherche, Trajet, Utilisateur, Vehicule } from '@contract';

import { addMinutes } from '@/shared/utils';

import type { Passing } from './matching';
import { quoteForTrip } from './pricing';
import { HttpError, findOr404, type RequestContext } from './server';
import { iso } from './time';
import { toLieu } from './tripGeo';

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

/**
 * One driver on the passenger's way (contract ResultatRecherche): pickup and drop put on the
 * path (keeping the passenger's names), when he passes, and the price. Search and booking quote.
 */
export function toSearchResult(
  ctx: RequestContext,
  trajet: Trajet,
  span: { pickup: number; drop: number },
  passing: Passing,
  names: { depart: Lieu; destination: Lieu },
  places: number,
): ResultatRecherche {
  const vehicule = findOr404(ctx.db.vehicules, (v) => v.id === trajet.vehiculeId, 'Véhicule');
  return {
    trajet,
    chauffeur: toPublicProfile(userById(ctx, trajet.chauffeurId)),
    vehicule: toVehicleSummary(vehicule),
    priseEnCharge: toLieu(trajet.chemin[span.pickup], names.depart.libelle),
    depose: toLieu(trajet.chemin[span.drop], names.destination.libelle),
    arriveeDansMinutes: passing.arrival ? passing.minutes : null,
    heurePassage: passing.arrival ? null : iso(addMinutes(ctx.now, passing.minutes)),
    ...quoteForTrip(ctx.db, trajet, span.pickup, span.drop, places),
  };
}
