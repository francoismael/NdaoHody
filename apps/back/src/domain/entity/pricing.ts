import type { Tarif } from '@contract';

/**
 * Price of one seat for the passenger's own part of the trip (pickup -> drop-off):
 * max(minimum price, km x price per km), rounded up to the next "arrondi" (100 Ar).
 * Car: 300 Ar/km, at least 3 000 Ar (12 km -> 3 600 Ar). Motorbike: 500 Ar/km, at least 5 000 Ar.
 * Always computed by the server, then frozen on the booking.
 */
export function seatPrice(distanceMetres: number, tarif: Pick<Tarif, 'prixMinimum' | 'prixParKm' | 'arrondi'>): number {
  const byDistance = (distanceMetres / 1000) * tarif.prixParKm;
  const rounded = Math.ceil(byDistance / tarif.arrondi) * tarif.arrondi;
  return Math.max(tarif.prixMinimum, rounded);
}

export function totalPrice(prixParPlace: number, places: number): number {
  return prixParPlace * places;
}
