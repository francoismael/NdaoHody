import type { DemandeRecherche, Position } from '@contract';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LngLat } from '@/shared/map';
import { matchesSearch } from '@/shared/utils';

import { computeRoute, placeAt, resolvePlace, searchPlaces } from '../services/placesService';
import {
  getDemoPosition,
  getMyTrips,
  getNearbyDrivers,
  getNearestPlace,
  getPlaces,
  getTrip,
  getTripsAround,
  publishTrip,
  searchTrips,
} from '../services/tripsService';
import type { ChosenPlace, Place, PlaceSuggestionItem, PublishTripInput } from '../types';

/** Live positions are sent every 5 s (contract). */
const LIVE_REFRESH_MS = 5000;

export const tripsKeys = {
  all: ['trips'] as const,
  search: (demande: DemandeRecherche | null) => [...tripsKeys.all, 'search', demande] as const,
  detail: (trajetId: number) => [...tripsKeys.all, 'detail', trajetId] as const,
  mine: () => [...tripsKeys.all, 'mine'] as const,
  around: (position: Position | null) => [...tripsKeys.all, 'around', position?.latitude, position?.longitude] as const,
  nearby: (position: Position | null) => [...tripsKeys.all, 'nearby', position?.latitude, position?.longitude] as const,
  places: () => [...tripsKeys.all, 'places'] as const,
  nearestPlace: (position: Position | null) => [...tripsKeys.all, 'nearest-place', position?.latitude, position?.longitude] as const,
  placeSearch: (query: string, sessionToken: string) => [...tripsKeys.all, 'place-search', query, sessionToken] as const,
  route: (from: ChosenPlace | null, to: ChosenPlace | null) =>
    [...tripsKeys.all, 'route', from?.longitude, from?.latitude, from?.placeId, to?.longitude, to?.latitude, to?.placeId] as const,
};

/** Fewer letters than this give too many vague suggestions (and cost requests). */
export const PLACE_SEARCH_MIN_CHARS = 2;

/** A known place as a choice (it keeps its id: usable offline). */
export const toChosenPlace = (place: Place): ChosenPlace => ({
  libelle: place.nom,
  latitude: place.latitude,
  longitude: place.longitude,
  placeId: place.id,
});

/** Places and roads change only with the dataset: no refetch while the app runs. */
const STATIC = { staleTime: Number.POSITIVE_INFINITY } as const;

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

/** Every place a driver can choose (departure list). */
export const usePlaces = () => useQuery({ queryKey: tripsKeys.places(), queryFn: getPlaces, ...STATIC });

/** The known place near the driver ("my position"); an error when none is close enough. */
export const useNearestPlace = (position: Position | null) =>
  useQuery({
    queryKey: tripsKeys.nearestPlace(position),
    queryFn: () => (position ? getNearestPlace(position) : Promise.reject(new Error('No position'))),
    enabled: position !== null,
    retry: false,
    ...STATIC,
  });

/**
 * Suggestions for the search bar: Mapbox while online; the known places (filtered)
 * when Mapbox cannot be reached, so the demo never stalls. `query` is already debounced.
 */
export function usePlaceSearch(query: string, sessionToken: string, near: Position) {
  const known = usePlaces();
  const text = query.trim();
  const live = useQuery({
    queryKey: tripsKeys.placeSearch(text, sessionToken),
    queryFn: ({ signal }) => searchPlaces(text, sessionToken, near, signal),
    enabled: text.length >= PLACE_SEARCH_MIN_CHARS,
    retry: false,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
  const offline = live.isError;
  const items: PlaceSuggestionItem[] =
    text.length < PLACE_SEARCH_MIN_CHARS
      ? []
      : offline
        ? (known.data ?? [])
            .filter((place) => matchesSearch(place.nom, text))
            .map((place): PlaceSuggestionItem => ({ key: `known-${place.id}`, name: place.nom, detail: null, source: 'known', place: toChosenPlace(place) }))
        : (live.data ?? []).map((s): PlaceSuggestionItem => ({ key: s.mapboxId, name: s.name, detail: s.detail, source: 'mapbox', mapboxId: s.mapboxId }));
  return { items, offline, searching: live.isFetching };
}

/** The coordinates of a chosen suggestion (a known place already has them). */
export const useResolvePlace = () =>
  useMutation({
    mutationFn: ({ item, sessionToken }: { item: PlaceSuggestionItem; sessionToken: string }) =>
      item.source === 'known' ? Promise.resolve(item.place) : resolvePlace(item.mapboxId, sessionToken, item.name),
  });

/** A point touched on the map, with the name of what is there. */
export const usePlaceAt = () => useMutation({ mutationFn: (coordinate: LngLat) => placeAt(coordinate) });

/** The road between the two chosen places (live, or recorded between known places offline). */
export const useRouteBetween = (from: ChosenPlace | null, to: ChosenPlace | null) =>
  useQuery({
    queryKey: tripsKeys.route(from, to),
    queryFn: () => (from && to ? computeRoute(from, to) : Promise.reject(new Error('No route'))),
    enabled: from !== null && to !== null,
    retry: false,
    ...STATIC,
  });

export function usePublishTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishTripInput) => publishTrip(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripsKeys.all }),
  });
}
