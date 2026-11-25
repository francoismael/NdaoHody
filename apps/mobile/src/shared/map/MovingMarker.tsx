import { CircleLayer, ShapeSource } from '@rnmapbox/maps';
import { useEffect, useRef, useState } from 'react';

import { useTheme } from '@/shared/theme';

import type { LngLat } from './geo';

type MovingMarkerProps = {
  /** Unique on the map (used for the source and the layer). */
  id: string;
  coordinate: LngLat;
  /**
   * Time to glide from the previous coordinate to the new one. Set it to the
   * refresh period of the data (5000 for the 5 s live position): the marker
   * then moves smoothly instead of jumping. 0 = jump.
   */
  glideMs?: number;
  /** vehicle: the moving car · place: a fixed point (pickup, drop). */
  kind?: 'vehicle' | 'place';
};

/** About 15 redraws per second: smooth enough, light on a mid-range phone. */
const FRAME_MS = 66;

/**
 * A point on AppMap drawn by ShapeSource + CircleLayer (the light way, unlike
 * MarkerView). Moving = updating the source's GeoJSON, as Mapbox does.
 * Knows nothing about carpooling.
 */
export function MovingMarker({ id, coordinate, glideMs = 0, kind = 'vehicle' }: MovingMarkerProps) {
  const { colors } = useTheme();
  const [shown, setShown] = useState<LngLat>(coordinate);
  const shownRef = useRef<LngLat>(coordinate);
  const [lng, lat] = coordinate;

  useEffect(() => {
    const from = shownRef.current;
    const to: LngLat = [lng, lat];
    const show = (point: LngLat): void => {
      shownRef.current = point;
      setShown(point);
    };
    if (glideMs <= 0 || (from[0] === to[0] && from[1] === to[1])) {
      show(to);
      return undefined;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / glideMs);
      show([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
      if (t === 1) clearInterval(timer);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [lng, lat, glideMs]);

  const vehicle = kind === 'vehicle';
  return (
    <ShapeSource id={`${id}-source`} shape={{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: shown } }}>
      <CircleLayer
        id={`${id}-circle`}
        style={{
          circleRadius: vehicle ? 9 : 7,
          circleColor: vehicle ? colors.primary : colors.surface,
          circleStrokeColor: vehicle ? colors.surface : colors.accent,
          circleStrokeWidth: 3,
        }}
      />
    </ShapeSource>
  );
}
