import type { TypeVehicule } from '@contract';
import { useQuery } from '@tanstack/react-query';

import { estimatePrice } from '../services/pricingService';

export const usePriceEstimate = (distanceMetres: number | null, places: number, typeVehicule: TypeVehicule) =>
  useQuery({
    queryKey: ['pricing', distanceMetres, places, typeVehicule] as const,
    queryFn: () => estimatePrice(distanceMetres ?? 0, places, typeVehicule),
    enabled: distanceMetres !== null,
  });
