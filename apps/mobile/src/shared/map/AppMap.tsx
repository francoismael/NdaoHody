import Mapbox, { Camera, LocationPuck, MapView } from '@rnmapbox/maps';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';

import { boundsOf, type LngLat } from './geo';
import { mapboxToken as token } from './token';

if (token) {
  Mapbox.setAccessToken(token);
}

/** Centre d'Antananarivo. Ordre Mapbox : [longitude, latitude]. */
export const TANA_CENTER: [number, number] = [47.5079, -18.8792];

/** Space the camera keeps free on each side, in points (what covers the map: header, panel). */
export type MapInsets = { top: number; bottom: number; left: number; right: number };

/** Frame the camera on these points, leaving `insets` free (e.g. a route above a bottom panel). */
export type MapFit = { coordinates: LngLat[]; insets: MapInsets };

type AppMapProps = {
  children?: ReactNode;
  /** À n'activer que si la permission de localisation est accordée. */
  showUserLocation?: boolean;
  /** When set, the camera frames these points instead of following the user. */
  fit?: MapFit | null;
  /** When set (and no `fit`), the camera flies to this point. */
  focus?: MapFocus | null;
  /** A tap on the map (not a drag), with the touched point. Fires a little after the tap (double-tap check). */
  onPress?: (coordinate: LngLat) => void;
  /**
   * The map moves or fades with its container (a sheet that slides in). Android: draws in a
   * TextureView, which follows the animation, instead of the default GLSurfaceView, which does
   * not (a bit slower: keep it for such maps). Read when the map is created only.
   */
  insideAnimation?: boolean;
};

/** Center the camera on one point (e.g. a place just found). */
export type MapFocus = { coordinate: LngLat; zoom: number };

/** The framed area never gets smaller than this: with bigger insets, Mapbox cannot place the camera. */
const MIN_VISIBLE = 120;
const FIT_DURATION_MS = 600;

/** Shrinks the insets so that at least MIN_VISIBLE points stay free in each direction. */
function clampInsets(insets: MapInsets, width: number, height: number): MapInsets {
  const scale = (a: number, b: number, size: number): [number, number] => {
    const room = Math.max(0, size - MIN_VISIBLE);
    const used = a + b;
    return used <= room || used === 0 ? [a, b] : [(a * room) / used, (b * room) / used];
  };
  const [top, bottom] = scale(insets.top, insets.bottom, height);
  const [left, right] = scale(insets.left, insets.right, width);
  return { top, bottom, left, right };
}

/** Carte de base de l'app : ne connaît rien du covoiturage. */
export function AppMap({ children, showUserLocation = false, fit = null, focus = null, onPress, insideAnimation = false }: AppMapProps) {
  const { colors, typography } = useTheme();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  // Memoized: a new bounds object on every render would move the camera again.
  const coordinates = fit?.coordinates;
  const bounds = useMemo(() => (coordinates && coordinates.length > 0 ? boundsOf(coordinates) : null), [coordinates]);
  const { top = 0, bottom = 0, left = 0, right = 0 } = fit?.insets ?? {};
  const padding = useMemo(() => {
    if (!size) return null;
    const clamped = clampInsets({ top, bottom, left, right }, size.width, size.height);
    return { paddingTop: clamped.top, paddingBottom: clamped.bottom, paddingLeft: clamped.left, paddingRight: clamped.right };
  }, [size, top, bottom, left, right]);

  if (!token) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.mapPlaceholder }]}>
        <Text style={[typography.small, { color: colors.textMuted, textAlign: 'center' }]}>Carte indisponible : EXPO_PUBLIC_MAPBOX_TOKEN manquant dans apps/mobile/.env</Text>
      </View>
    );
  }


  return (
    <View style={styles.map} onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
      <MapView
        style={[styles.map, { backgroundColor: colors.mapPlaceholder }]}
        scaleBarEnabled={false}
        surfaceView={!insideAnimation}
        onPress={
          onPress
            ? (feature) => {
                const [lng, lat] = feature.geometry.coordinates;
                if (typeof lng === 'number' && typeof lat === 'number') onPress([lng, lat]);
              }
            : undefined
        }
      >
        {bounds && padding ? (
          <Camera
            defaultSettings={{ centerCoordinate: TANA_CENTER, zoomLevel: 12 }}
            bounds={bounds}
            padding={padding}
            animationDuration={FIT_DURATION_MS}
            animationMode="easeTo"
          />
        ) : focus ? (
          <Camera
            defaultSettings={{ centerCoordinate: TANA_CENTER, zoomLevel: 12 }}
            centerCoordinate={focus.coordinate}
            zoomLevel={focus.zoom}
            animationDuration={FIT_DURATION_MS}
            animationMode="easeTo"
          />
        ) : (
          <Camera
            defaultSettings={{ centerCoordinate: TANA_CENTER, zoomLevel: 12 }}
            followUserLocation={showUserLocation}
            followZoomLevel={15}
          />
        )}
        {showUserLocation && <LocationPuck />}
        {children}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
