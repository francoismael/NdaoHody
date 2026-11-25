import { CircleLayer, ShapeSource } from '@rnmapbox/maps';
import { useMemo } from 'react';

import { useTheme } from '@/shared/theme';

import type { LngLat } from './geo';

export type MapPoint = { id: number; coordinate: LngLat };

type MapPointsProps = {
  /** Unique on the map (used for the source and the layer). */
  id: string;
  points: readonly MapPoint[];
  selectedId: number | null;
  /** Called with the id of the touched point (44 × 44 pt touch area, Mapbox default). */
  onPress: (pointId: number) => void;
};

/**
 * Points the user can touch on AppMap: one ShapeSource + CircleLayer (light, unlike one
 * MarkerView per point). The selected one is filled. Knows nothing about carpooling.
 */
export function MapPoints({ id, points, selectedId, onPress }: MapPointsProps) {
  const { colors } = useTheme();
  const shape = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: points.map((point) => ({
        type: 'Feature' as const,
        properties: { pointId: point.id },
        geometry: { type: 'Point' as const, coordinates: point.coordinate },
      })),
    }),
    [points],
  );
  const chosen = selectedId ?? -1;

  return (
    <ShapeSource
      id={`${id}-source`}
      shape={shape}
      onPress={(event) => {
        const raw: unknown = event.features[0]?.properties?.pointId;
        if (typeof raw === 'number') onPress(raw);
      }}
    >
      <CircleLayer
        id={`${id}-circles`}
        style={{
          circleRadius: ['case', ['==', ['get', 'pointId'], chosen], 11, 8],
          circleColor: ['case', ['==', ['get', 'pointId'], chosen], colors.accent, colors.surface],
          circleStrokeColor: colors.accent,
          circleStrokeWidth: 3,
        }}
      />
    </ShapeSource>
  );
}
