import type { DemandeRecherche, Position } from '@contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDemoPosition, getMyTrips, getNearbyDrivers, getTrip, getTripsAround, publishTrip, searchTrips } from '../services/tripsService';
import type { PublishTripInput } from '../types';

/** Live positions are sent every 5 s (contract). */
const LIVE_REFRESH_MS = 5000;

export const tripsKeys = {
  all: ['trips'] as const,
  search: (demande: DemandeRecherche | null) => [...tripsKeys.all, 'search', demande] as const,
  detail: (trajetId: number) => [...tripsKeys.all, 'detail', trajetId] as const,
  mine: () => [...tripsKeys.all, 'mine'] as const,
  around: (position: Position | null) => [...tripsKeys.all, 'around', position?.latitude, position?.longitude] as const,
  nearby: (position: Position | null) => [...tripsKeys.all, 'nearby', position?.latitude, position?.longitude] as const,
};

/** Runs only once the passenger has filled the search (`demande` not null). */
export const useSearchTrips = (demande: DemandeRecherche | null) =>
  useQuery({
    queryKey: tripsKeys.search(demande),
    queryFn: () => (demande ? searchTrips(demande) : Promise.resolve([])),
    enabled: demande !== null,
  });

export const useTrip = (trajetId: number) =>
  useQuery({ queryKey: tripsKeys.detail(trajetId), queryFn: () => getTrip(trajetId) });

export const useMyTrips = () => useQuery({ queryKey: tripsKeys.mine(), queryFn: getMyTrips });

export const useNearbyDrivers = (position: Position | null) =>
  useQuery({
    queryKey: tripsKeys.nearby(position),
    queryFn: () => (position ? getNearbyDrivers(position) : Promise.resolve([])),
    enabled: position !== null,
    refetchInterval: LIVE_REFRESH_MS,
  });

/** Trips on the road passing near the passenger (refreshed like live positions). */
export const useTripsAround = (position: Position | null) =>
  useQuery({
    queryKey: tripsKeys.around(position),
    queryFn: () => (position ? getTripsAround(position) : Promise.resolve([])),
    enabled: position !== null,
    refetchInterval: LIVE_REFRESH_MS,
  });

/** PROVISIONAL (until R12 uses the GPS position): the demo position. */
export const useDemoPosition = (): Position => getDemoPosition();

export function usePublishTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishTripInput) => publishTrip(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripsKeys.all }),
  });
}
