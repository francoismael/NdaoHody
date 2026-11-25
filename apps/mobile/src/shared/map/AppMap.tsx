import Mapbox, { Camera, LocationPuck, MapView } from '@rnmapbox/maps';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';

import { mapboxToken as token } from './token';

if (token) {
  Mapbox.setAccessToken(token);
}

/** Centre d'Antananarivo. Ordre Mapbox : [longitude, latitude]. */
export const TANA_CENTER: [number, number] = [47.5079, -18.8792];

type AppMapProps = {
  children?: ReactNode;
  /** À n'activer que si la permission de localisation est accordée. */
  showUserLocation?: boolean;
};

/** Carte de base de l'app : ne connaît rien du covoiturage. */
export function AppMap({ children, showUserLocation = false }: AppMapProps) {
  const { colors, typography } = useTheme();

  if (!token) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.mapPlaceholder }]}>
        <Text style={[typography.small, { color: colors.textMuted, textAlign: 'center' }]}>Carte indisponible : EXPO_PUBLIC_MAPBOX_TOKEN manquant dans apps/mobile/.env</Text>
      </View>
    );
  }

  return (
    <MapView style={[styles.map, { backgroundColor: colors.mapPlaceholder }]} scaleBarEnabled={false}>
      <Camera
        defaultSettings={{ centerCoordinate: TANA_CENTER, zoomLevel: 12 }}
        followUserLocation={showUserLocation}
        followZoomLevel={15}
      />
      {showUserLocation && <LocationPuck />}
      {children}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
