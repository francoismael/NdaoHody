import type { LngLat } from './geo';
import { RouteLine } from './RouteLine';
import { useGlide } from './useGlide';

type MovingRouteProps = {
  /** Unique on the map (used for the source and the layer). */
  id: string;
  /** The moving point the route starts from (a car), as its MovingMarker gets it. */
  from: LngLat;
  /** The road ahead, starting at `from` (as the data sends it). Empty: nothing drawn. */
  path: LngLat[];
  /** Same value as the marker's: the route's start glides with the marker, never ahead of it. */
  glideMs: number;
  belowLayerID?: string;
};

/**
 * A route that starts at a moving marker. The data cuts the road at the NEW position at once,
 * while the marker still glides from the old one: the start of the line follows the drawn
 * point instead (same glide), so no gap opens in front of the car. Knows nothing about carpooling.
 */
export function MovingRoute({ id, from, path, glideMs, belowLayerID }: MovingRouteProps) {
  const start = useGlide(from, glideMs);
  return <RouteLine id={id} coordinates={path.length > 0 ? [start, ...path] : []} belowLayerID={belowLayerID} />;
}
