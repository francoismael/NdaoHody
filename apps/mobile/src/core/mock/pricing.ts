import type { Reservation, Tarif, Trajet, TypeVehicule } from '@contract';

import { segmentMetres } from './tripGeo';
import type { MockDb } from './types';

/**
 * Price rule of the SIMULATED server, as in the contract (`Tarif`, 25/11):
 * seat price = max(prixMinimum, passenger km × prixParKm), rounded up to `arrondi`.
 * Total = seat price × seats. The server computes every price; the app only shows it.
 */
export const TARIFS: Record<TypeVehicule, Tarif> = {
  voiture: { typeVehicule: 'voiture', prixMinimum: 3000, prixParKm: 300, arrondi: 100 },
  moto: { typeVehicule: 'moto', prixMinimum: 5000, prixParKm: 500, arrondi: 100 },
};

export function seatPrice(distanceMetres: number, typeVehicule: TypeVehicule): number {
  const { prixMinimum, prixParKm, arrondi } = TARIFS[typeVehicule];
  const raw = (distanceMetres / 1000) * prixParKm;
  return Math.max(prixMinimum, Math.ceil(raw / arrondi) * arrondi);
}

/** The three price fields the contract puts on a Reservation and a ResultatRecherche. */
export type Quote = Pick<Reservation, 'distanceMetres' | 'prixParPlace' | 'prixTotal'>;

export function quote(distanceMetres: number, places: number, typeVehicule: TypeVehicule): Quote {
  const prixParPlace = seatPrice(distanceMetres, typeVehicule);
  return { distanceMetres, prixParPlace, prixTotal: prixParPlace * places };
}

/** Price of the passenger's part of a trip (pickup → drop path indexes), with the trip's vehicle tarif. */
export function quoteForTrip(db: MockDb, trajet: Trajet, pickupIndex: number, dropIndex: number, places: number): Quote {
  const vehicule = db.vehicules.find((v) => v.id === trajet.vehiculeId);
  return quote(segmentMetres(trajet, pickupIndex, dropIndex), places, vehicule?.type ?? 'voiture');
}
