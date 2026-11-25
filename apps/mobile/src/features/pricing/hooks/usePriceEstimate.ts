import { useQuery } from '@tanstack/react-query';

import { estimatePrice } from '../services/pricingService';

export const usePriceEstimate = (distanceMetres: number | null, places: number) =>
  useQuery({
    queryKey: ['pricing', distanceMetres, places] as const,
    queryFn: () => estimatePrice(distanceMetres ?? 0, places),
    enabled: distanceMetres !== null,
  });
