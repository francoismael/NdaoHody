/**
 * Price rule of the SIMULATED server (validated decision, 23/11).
 * Per seat: 300 Ar per km of the passenger's segment, at least 3 000 Ar,
 * rounded up to the next 100 Ar. Total = seat price × seats.
 *
 * GAP #1 with data-objets.ts (sent to the backend): the contract has a fixed
 * `Trajet.prixParPlace` and price tiers (`PalierPrix`). Provisional decision:
 * the SERVER computes every price; the app only displays it and never computes one.
 */
export const PRICE_PER_KM_AR = 300;
export const MIN_SEAT_PRICE_AR = 3000;
const ROUNDING_AR = 100;

export function seatPrice(distanceMetres: number): number {
  const raw = (distanceMetres / 1000) * PRICE_PER_KM_AR;
  return Math.max(MIN_SEAT_PRICE_AR, Math.ceil(raw / ROUNDING_AR) * ROUNDING_AR);
}

export const totalPrice = (distanceMetres: number, seats: number): number => seatPrice(distanceMetres) * seats;
