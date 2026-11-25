import type { PriceEstimate } from '@/features/pricing/types';

import { quote } from '../pricing';
import { requireNumber, requireOneOf, type MockRoute } from '../server';

export const pricingRoutes: MockRoute[] = [
  {
    method: 'POST',
    pattern: '/pricing/estimate',
    handler: ({ body }): PriceEstimate => {
      const distance = Math.round(requireNumber(body, 'distanceMetres'));
      const places = Math.max(1, Math.round(requireNumber(body, 'places')));
      const { prixParPlace, prixTotal } = quote(distance, places, requireOneOf(body, 'typeVehicule', ['voiture', 'moto'] as const));
      return { prixParPlace, prixTotal };
    },
  },
];
