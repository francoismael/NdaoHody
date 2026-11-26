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
  /**
   * toward (default): what comes to the user (e.g. the driver's road to him), and any plain route;
   * onward: the rest of a route, after the user (bright amber, light and dark mode).
   */
  tone?: 'toward' | 'onward';
};

/** A route drawn on AppMap. Knows nothing about carpooling. */
export function RouteLine({ id, coordinates, belowLayerID, tone = 'toward' }: RouteLineProps) {
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
        style={{ lineColor: tone === 'toward' ? colors.accent : colors.mapRouteOnward, lineWidth: 4, lineOpacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
      />
    </ShapeSource>
  );
}
