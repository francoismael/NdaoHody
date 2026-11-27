import { LineLayer, ShapeSource } from '@rnmapbox/maps';

import { useTheme } from '@/shared/theme';

import type { LngLat } from './geo';

type RouteLineProps = {
  /** Unique on the map (used for the source and the layer). */
  id: string;
  coordinates: LngLat[];
  /**
   * Draw the route under this layer (e.g. a marker's `${id}-circle`): a layer added
   * later is drawn on top, so a route that appears after its points would hide them.
   */
  belowLayerID?: string;
};

/**
 * A route drawn on AppMap. Knows nothing about carpooling.
 * One colour for every route of the app (27/11): the bright amber, light and dark mode.
 */
export function RouteLine({ id, coordinates, belowLayerID }: RouteLineProps) {
  const { colors } = useTheme();
  if (coordinates.length < 2) return null;
  return (
    <ShapeSource
      id={`${id}-source`}
      shape={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }}
    >
      <LineLayer
        id={`${id}-line`}
        belowLayerID={belowLayerID}
        style={{ lineColor: colors.mapRouteOnward, lineWidth: 4, lineOpacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
      />
    </ShapeSource>
  );
}
