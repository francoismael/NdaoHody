import { LineLayer, ShapeSource } from '@rnmapbox/maps';

import { useTheme } from '@/shared/theme';

import type { LngLat } from './geo';

type RouteLineProps = {
  /** Unique on the map (used for the source and the layer). */
  id: string;
  coordinates: LngLat[];
};

/** A route drawn on AppMap. Knows nothing about carpooling. */
export function RouteLine({ id, coordinates }: RouteLineProps) {
  const { colors } = useTheme();
  if (coordinates.length < 2) return null;
  return (
    <ShapeSource
      id={`${id}-source`}
      shape={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }}
    >
      <LineLayer
        id={`${id}-line`}
        style={{ lineColor: colors.accent, lineWidth: 4, lineOpacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
      />
    </ShapeSource>
  );
}
