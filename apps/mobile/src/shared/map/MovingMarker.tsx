import { CircleLayer, ShapeSource, SymbolLayer } from '@rnmapbox/maps';

import { useTheme } from '@/shared/theme';

import type { LngLat } from './geo';
import { useGlide } from './useGlide';

type MovingMarkerProps = {
  /** Unique on the map (used for the source and the layer). */
  id: string;
  coordinate: LngLat;
  /**
   * Shortest glide from the previous coordinate to the new one (see useGlide). Set it to the
   * refresh period of the data (5000 for the 5 s live position): the marker
   * then moves smoothly instead of jumping. 0 = jump.
   */
  glideMs?: number;
  /** vehicle: the moving car · place: a fixed point (pickup, drop). */
  kind?: 'vehicle' | 'place';
  /** A short text drawn inside the point (a rank: "1", "2"…). */
  label?: string;
  /** Same size, with an accent ring (the item chosen in a list). */
  highlighted?: boolean;
  /** Ring of a place: accent (default) or onward (the end of a route after the user). */
  tone?: 'accent' | 'onward';
};

/**
 * A point on AppMap drawn by ShapeSource + CircleLayer (the light way, unlike
 * MarkerView). Moving = updating the source's GeoJSON, as Mapbox does.
 * Knows nothing about carpooling.
 */
export function MovingMarker({ id, coordinate, glideMs = 0, kind = 'vehicle', label, highlighted = false, tone = 'accent' }: MovingMarkerProps) {
  const { colors } = useTheme();
  const shown = useGlide(coordinate, glideMs);

  const vehicle = kind === 'vehicle';
  const circle = (
    <CircleLayer
      key="circle"
      id={`${id}-circle`}
      style={{
        // About the size of the blue GPS dot: places 5 + ring 2, vehicles 7 (+2 with a rank). Chosen: same size.
        circleRadius: (vehicle ? 7 : 5) + (label ? 2 : 0),
        circleColor: vehicle ? colors.primary : colors.surface,
        circleStrokeColor: highlighted ? colors.accent : vehicle ? colors.surface : tone === 'onward' ? colors.mapRouteOnward : colors.accent,
        circleStrokeWidth: 2,
      }}
    />
  );
  // ShapeSource accepts layers only (no null child): the label layer is added to the list when needed.
  return (
    <ShapeSource id={`${id}-source`} shape={{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: shown } }}>
      {label
        ? [
            circle,
            <SymbolLayer
              key="label"
              id={`${id}-label`}
              style={{
                textField: label,
                textSize: 10,
                textColor: vehicle ? colors.onPrimary : colors.text,
                textAllowOverlap: true,
                textIgnorePlacement: true,
              }}
            />,
          ]
        : circle}
    </ShapeSource>
  );
}
