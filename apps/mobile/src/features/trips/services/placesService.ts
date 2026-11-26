import type { Lieu, Position } from '@contract';

import { MIN_POINT_STEP_M } from '@/core/mock';
import { areaNameAt, fetchDrivingRoute, haversineMeters, retrievePlace, suggestPlaces, thinPath, type LngLat } from '@/shared/map';

import { PUBLISH_MESSAGES as M } from '../rules';
import type { ChosenPlace, RoutePreview } from '../types';
import { getPlaces, getRoutePreview } from './tripsService';

/*
 * PROVISIONAL (GAP #8): the app asks Mapbox itself for places and roads.
 * Tomorrow the API does both; only this file changes.
 */

/** Places matching `query`, near `near` first, in Madagascar. Throws PlaceSearchUnavailable offline. */
export const searchPlaces = (query: string, sessionToken: string, near: Position, signal?: AbortSignal) =>
  suggestPlaces(query, { sessionToken, proximity: [near.longitude, near.latitude], country: 'mg', signal });

/** Coordinates of a chosen suggestion. */
export async function resolvePlace(mapboxId: string, sessionToken: string, name: string): Promise<ChosenPlace> {
  const found = await retrievePlace(mapboxId, sessionToken);
  return { libelle: found.name || name, longitude: found.coordinate[0], latitude: found.coordinate[1], placeId: null };
}

/** "Ivato": the closest known place, by its area (the part before the comma). Works offline. */
async function approximateName(coordinate: LngLat): Promise<string> {
  try {
    const places = await getPlaces();
    if (places.length === 0) return M.unnamedPoint;
    const closest = places.reduce((a, b) =>
      haversineMeters([b.longitude, b.latitude], coordinate) < haversineMeters([a.longitude, a.latitude], coordinate) ? b : a,
    );
    return closest.nom.split(',')[0].trim();
  } catch {
    return M.unnamedPoint;
  }
}

/**
 * A point touched on the map, always named after an AREA: the neighbourhood (or locality,
 * or town) Mapbox knows there; otherwise, and offline, the closest known place.
 */
export async function placeAt(coordinate: LngLat): Promise<ChosenPlace> {
  const [longitude, latitude] = coordinate;
  let area: string | null = null;
  try {
    area = await areaNameAt(coordinate);
  } catch {
    area = null;
  }
  return { libelle: area ?? (await approximateName(coordinate)), longitude, latitude, placeId: null };
}

const toLieu = ({ libelle, latitude, longitude }: ChosenPlace): Lieu => ({ libelle, latitude, longitude });

/** The road from `from` to `to`: live (Mapbox Directions), else a recorded one between known places. */
export async function computeRoute(from: ChosenPlace, to: ChosenPlace): Promise<RoutePreview> {
  const live = await fetchDrivingRoute([
    [from.longitude, from.latitude],
    [to.longitude, to.latitude],
  ]);
  if (live) {
    return {
      depart: toLieu(from),
      arrivee: toLieu(to),
      chemin: thinPath(live.coordinates, MIN_POINT_STEP_M),
      distanceMetres: live.distanceMeters,
      dureeSecondes: live.durationSeconds,
    };
  }
  if (from.placeId !== null && to.placeId !== null) return getRoutePreview(from.placeId, to.placeId);
  throw new Error(M.routeOffline);
}
