import type { ProfilPublic, Reservation, Vehicule } from '@contract';
import type { Booking } from '../../domain/entity/Booking';
import type { User } from '../../domain/entity/User';
import type { Vehicle } from '../../domain/entity/Vehicle';

/** What others see of a user: never the phone number. */
export function toPublicProfile(user: User): ProfilPublic {
  return {
    id: user.id,
    prenom: user.prenom ?? 'Utilisateur',
    photoUrl: user.photoUrl,
    badge: user.badge,
    noteMoyenne: user.noteMoyenne,
    nombreNotes: user.nombreNotes,
  };
}

export type VehicleSummary = Pick<Vehicule, 'type' | 'marque' | 'modele' | 'couleur' | 'immatriculation'>;

export function toVehicleSummary(vehicle: Vehicle): VehicleSummary {
  return {
    type: vehicle.type,
    marque: vehicle.marque,
    modele: vehicle.modele,
    couleur: vehicle.couleur,
    immatriculation: vehicle.immatriculation,
  };
}

/** The data object (the refusal reason has its own route). */
export function toReservation(booking: Booking): Reservation {
  const reservation: Reservation & { motifRefus?: string | null } = { ...booking };
  delete reservation.motifRefus;
  return reservation;
}
