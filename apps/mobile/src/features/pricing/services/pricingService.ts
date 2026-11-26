import type { DemandeReservation, TypeVehicule } from '@contract';

import { request } from '@/core/mock';

import type { PriceEstimate, PriceQuote } from '../types';

/** The server computes every price (contract: Tarif per vehicle type); the app only shows it. */
export const estimatePrice = (distanceMetres: number, places: number, typeVehicule: TypeVehicule) =>
  request<PriceEstimate>('POST', '/pricing/estimate', { distanceMetres, places, typeVehicule });

/** Price of a booking before it is sent: same body as POST /reservations (GAP #15). */
export const quoteReservation = (demande: DemandeReservation) => request<PriceQuote>('POST', '/reservations/quote', demande);
