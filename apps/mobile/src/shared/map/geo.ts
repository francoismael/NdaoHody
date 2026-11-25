/** A map point in GeoJSON/Mapbox order: [longitude, latitude]. */
export type LngLat = [number, number];

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in meters. */
export function haversineMeters([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Length of a path between two point indexes (whole path by default). */
export function pathLengthMeters(path: LngLat[], from = 0, to = path.length - 1): number {
  let total = 0;
  for (let i = Math.max(from, 0) + 1; i <= Math.min(to, path.length - 1); i += 1) {
    total += haversineMeters(path[i - 1], path[i]);
  }
  return total;
}

/** Index of the path point closest to `point`, and its distance. */
export function nearestPointIndex(path: LngLat[], point: LngLat): { index: number; distanceMeters: number } {
  let index = 0;
  let distanceMeters = Number.POSITIVE_INFINITY;
  path.forEach((candidate, i) => {
    const d = haversineMeters(candidate, point);
    if (d < distanceMeters) {
      distanceMeters = d;
      index = i;
    }
  });
  return { index, distanceMeters };
}

/** Index of the point reached after `fraction` (0 to 1) of the path length. */
export function indexAtFraction(path: LngLat[], fraction: number): number {
  const target = pathLengthMeters(path) * Math.min(Math.max(fraction, 0), 1);
  let walked = 0;
  for (let i = 1; i < path.length; i += 1) {
    walked += haversineMeters(path[i - 1], path[i]);
    if (walked >= target) return i;
  }
  return path.length - 1;
}

/** Straight segments between stops, with a point every `stepMeters` (draft path). */
export function densify(stops: LngLat[], stepMeters: number): LngLat[] {
  const result: LngLat[] = [];
  stops.forEach((stop, i) => {
    if (i === 0) {
      result.push(stop);
      return;
    }
    const prev = stops[i - 1];
    const steps = Math.max(1, Math.ceil(haversineMeters(prev, stop) / stepMeters));
    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      result.push([prev[0] + (stop[0] - prev[0]) * t, prev[1] + (stop[1] - prev[1]) * t]);
    }
  });
  return result;
}

/** Drops points closer than `minStepMeters` to the last kept one (first and last are always kept). */
export function thinPath(path: LngLat[], minStepMeters: number): LngLat[] {
  if (path.length <= 2) return path;
  const result: LngLat[] = [path[0]];
  for (let i = 1; i < path.length - 1; i += 1) {
    if (haversineMeters(result[result.length - 1], path[i]) >= minStepMeters) result.push(path[i]);
  }
  result.push(path[path.length - 1]);
  return result;
}

/**
 * Point at `meters` along the path (same behaviour as turf.along): past the end,
 * the last point is returned and `done` is true, so arrival is never missed.
 */
export function pointAlong(path: LngLat[], meters: number): { point: LngLat; done: boolean } {
  if (path.length === 0) throw new RangeError('pointAlong: empty path');
  if (meters <= 0) return { point: path[0], done: path.length === 1 };
  let walked = 0;
  for (let i = 1; i < path.length; i += 1) {
    const step = haversineMeters(path[i - 1], path[i]);
    if (walked + step >= meters) {
      const t = step === 0 ? 0 : (meters - walked) / step;
      const [lng1, lat1] = path[i - 1];
      const [lng2, lat2] = path[i];
      return { point: [lng1 + (lng2 - lng1) * t, lat1 + (lat2 - lat1) * t], done: false };
    }
    walked += step;
  }
  return { point: path[path.length - 1], done: true };
}

/**
 * Where a point sits along the path, in meters from the start
 * (projected on the nearest path point; paths are thinned to ~20 m).
 */
export const metersAlong = (path: LngLat[], point: LngLat): number =>
  pathLengthMeters(path, 0, nearestPointIndex(path, point).index);

/** The box around a path, as Mapbox's camera wants it (north-east and south-west corners). */
export function boundsOf(path: LngLat[]): { ne: LngLat; sw: LngLat } {
  if (path.length === 0) throw new RangeError('boundsOf: empty path');
  let [minLng, minLat] = path[0];
  let [maxLng, maxLat] = path[0];
  path.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  return { ne: [maxLng, maxLat], sw: [minLng, minLat] };
}
