import type { TypeVehicule, Vehicule } from '@contract';

/** A vehicle of a driver (table vehicule). Same fields as the data object. */
export type Vehicle = Vehicule;

export type NewVehicle = Pick<
  Vehicle,
  'utilisateurId' | 'type' | 'marque' | 'modele' | 'couleur' | 'immatriculation' | 'places' | 'photoUrl' | 'parDefaut'
>;

export type VehicleChanges = Partial<
  Pick<Vehicle, 'utilisateurId' | 'type' | 'marque' | 'modele' | 'couleur' | 'places' | 'photoUrl' | 'parDefaut' | 'statut' | 'motifRefus'>
>;

export const MAX_CAR_SEATS = 8;

/** A motorbike carries 1 passenger; a car 1 to 8. Same rule as ck_vehicule_places. */
export function isValidSeatCount(type: TypeVehicule, places: number): boolean {
  if (!Number.isInteger(places) || places < 1) {
    return false;
  }
  return type === 'moto' ? places === 1 : places <= MAX_CAR_SEATS;
}
