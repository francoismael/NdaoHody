import type { Chemin, Position } from '@contract';

const EARTH_RADIUS_M = 6_371_000;

/** Madagascar and its islands, with a margin. */
const MADAGASCAR_BOUNDS = { minLatitude: -26, maxLatitude: -11.5, minLongitude: 43, maxLongitude: 51 };

/** Two points closer than this on a stored path are merged (a path stays light for the app). */
export const PATH_MIN_STEP_M = 20;

/** Distance as the crow flies, in metres. */
export function haversineMeters(a: Position, b: Position): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const dLatitude = toRadians(b.latitude - a.latitude);
  const dLongitude = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLatitude / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLongitude / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function isInMadagascar({ latitude, longitude }: Position): boolean {
  return (
    latitude >= MADAGASCAR_BOUNDS.minLatitude &&
    latitude <= MADAGASCAR_BOUNDS.maxLatitude &&
    longitude >= MADAGASCAR_BOUNDS.minLongitude &&
    longitude <= MADAGASCAR_BOUNDS.maxLongitude
  );
}

/** [longitude, latitude] (GeoJSON order, as in Chemin) to a Position. */
export function toPosition([longitude, latitude]: [number, number]): Position {
  return { latitude, longitude };
}

/**
 * Drops the points closer than `minStepMeters` to the last kept one.
 * The first and last points are always kept, so the path still starts and ends at the right place.
 */
export function thinPath(path: Chemin, minStepMeters = PATH_MIN_STEP_M): Chemin {
  if (path.length <= 2) {
    return path;
  }
  const kept: Chemin = [path[0] as [number, number]];
  for (const point of path.slice(1, -1)) {
    const last = kept[kept.length - 1] as [number, number];
    if (haversineMeters(toPosition(last), toPosition(point)) >= minStepMeters) {
      kept.push(point);
    }
  }
  kept.push(path[path.length - 1] as [number, number]);
  return kept;
}

/** Same point to about 1 m (5 decimals): used as a cache key. */
export function positionKey({ latitude, longitude }: Position): string {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}
