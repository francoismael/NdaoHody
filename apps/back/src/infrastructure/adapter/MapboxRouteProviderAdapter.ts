import { Injectable } from '@nestjs/common';
import type { Chemin, Position } from '@contract';
import { DrivingRoute, RouteProvider } from '../../application/port/RouteProvider';
import { positionKey, toPosition } from '../../domain/entity/geo';
import { DomainException } from '../../domain/exception/DomainException';
import { isLngLat, isRecord } from '../helper/json';
import { MAP_UNAVAILABLE_MESSAGE, MapboxClient } from './MapboxClient';

/** Mapbox Directions accepts up to 25 stops per call. */
const MAX_STOPS = 25;
/** The same route is asked again and again (search, publishing...): kept 10 minutes. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHED = 500;
const NO_ROAD_CODES = ['NoRoute', 'NoSegment'];

export const NO_ROAD_MESSAGE = "Aucune route ne relie ces points. Choisis un point plus proche d'une rue.";

/**
 * Mapbox Directions, "driving" profile: shortest road route, distance, duration,
 * and each stop moved onto the nearest road (the "waypoints" of the answer).
 */
@Injectable()
export class MapboxRouteProviderAdapter extends RouteProvider {
  private readonly cache = new Map<string, { route: DrivingRoute; expiresAt: number }>();

  constructor(private readonly mapbox: MapboxClient) {
    super();
  }

  async route(stops: readonly Position[]): Promise<DrivingRoute> {
    if (stops.length < 2 || stops.length > MAX_STOPS) {
      throw new RangeError(`A route needs 2 to ${MAX_STOPS} stops, got ${stops.length}.`);
    }
    const key = stops.map(positionKey).join(';');
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.route;
    }

    const coordinates = stops.map(({ longitude, latitude }) => `${longitude.toFixed(6)},${latitude.toFixed(6)}`).join(';');
    const { body } = await this.mapbox.get('directions', `/directions/v5/mapbox/driving/${coordinates}`, {
      geometries: 'geojson',
      overview: 'full',
    });
    const route = parseDirections(body);
    this.remember(key, route);
    return route;
  }

  private remember(key: string, route: DrivingRoute): void {
    this.cache.set(key, { route, expiresAt: Date.now() + CACHE_TTL_MS });
    if (this.cache.size > MAX_CACHED) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
  }
}

/** Reads a Mapbox Directions answer. Exported for the tests. */
export function parseDirections(body: unknown): DrivingRoute {
  if (!isRecord(body)) {
    throw new DomainException('unavailable', MAP_UNAVAILABLE_MESSAGE);
  }
  if (typeof body['code'] === 'string' && NO_ROAD_CODES.includes(body['code'])) {
    throw new DomainException('invalid', NO_ROAD_MESSAGE);
  }
  if (body['code'] === 'InvalidInput') {
    throw new DomainException('invalid', 'Ces points ne permettent pas de calculer un itinéraire.');
  }

  const route = Array.isArray(body['routes']) ? (body['routes'][0] as unknown) : undefined;
  const geometry = isRecord(route) ? route['geometry'] : undefined;
  const coordinates = isRecord(geometry) ? geometry['coordinates'] : undefined;
  if (
    !isRecord(route) ||
    !Array.isArray(coordinates) ||
    !coordinates.every(isLngLat) ||
    typeof route['distance'] !== 'number' ||
    typeof route['duration'] !== 'number'
  ) {
    throw new DomainException('unavailable', MAP_UNAVAILABLE_MESSAGE);
  }

  const waypoints = Array.isArray(body['waypoints']) ? (body['waypoints'] as unknown[]) : [];
  const chemin: Chemin = coordinates.map(([longitude, latitude]) => [longitude, latitude]);
  return {
    chemin,
    distanceMetres: Math.round(route['distance']),
    dureeSecondes: Math.round(route['duration']),
    pointsSurRoute: waypoints.flatMap((waypoint) =>
      isRecord(waypoint) && isLngLat(waypoint['location']) ? [toPosition(waypoint['location'])] : [],
    ),
  };
}
