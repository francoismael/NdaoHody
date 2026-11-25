import type { TypeVehicule } from '@contract';

import { request } from '@/core/mock';

import type { PriceEstimate } from '../types';

/** The server computes every price (contract: Tarif per vehicle type); the app only shows it. */
export const estimatePrice = (distanceMetres: number, places: number, typeVehicule: TypeVehicule) =>
  request<PriceEstimate>('POST', '/pricing/estimate', { distanceMetres, places, typeVehicule });
