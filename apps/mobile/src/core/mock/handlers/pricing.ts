import type { PriceEstimate } from '@/features/pricing/types';

import { seatPrice, totalPrice } from '../pricing';
import { requireNumber, type MockRoute } from '../server';

export const pricingRoutes: MockRoute[] = [
  {
    method: 'POST',
    pattern: '/pricing/estimate',
    handler: ({ body }): PriceEstimate => {
      const distance = requireNumber(body, 'distanceMetres');
      const places = Math.max(1, Math.round(requireNumber(body, 'places')));
      return { prixParPlace: seatPrice(distance), prixTotal: totalPrice(distance, places) };
    },
  },
];
