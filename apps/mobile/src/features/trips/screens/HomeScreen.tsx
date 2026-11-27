import { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth';
import { AppMap, PlaceLabel, RouteLine, type MapFit } from '@/shared/map';
import { useTheme, type Theme } from '@/shared/theme';

import { DriverHomePanel } from '../components/DriverHomePanel';
import { LocationPrompt, LocationVeil } from '../components/LocationPrompt';
import { PassengerHome } from '../components/PassengerHome';
import { useLocationIssue, type LocationState } from '../hooks/useLocationIssue';
import { usePublishAccess } from '../hooks/usePublishAccess';
import { useMyTrips } from '../hooks/useTrips';
import { ACTIVE_TRIP_STATUSES } from '../rules';

/** The first tab: the passenger home or the driver home, with the dev links on top. */
export function HomeScreen() {
  const { isDriver } = useSession();
  const location = useLocationIssue();
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      {isDriver ? <DriverHome {...location} /> : <PassengerHome {...location} />}

      {/* PROVISOIRE (sessions 3, 4 et R1) : accès aux écrans de contrôle, en dev seulement. */}
      {__DEV__ && (
        <View style={[styles.devLinks, { top: insets.top + spacing[3] }]}>
          <Link href="/theme-preview" style={styles.devLink}>
            Thème
          </Link>
          <Link href="/ui-preview" style={styles.devLink}>
            UI
          </Link>
          <Link href="/control" style={styles.devLink}>
            Contrôle
          </Link>
        </View>
      )}
    </View>
  );
}

/** Past this many trips the panel is tall: the location card keeps only its shortest line. */
const MANY_TRIPS = 3;

/** Driver home: the panel with his coming trips at the bottom (the touched one on the map); no position: a card on the map. */
function DriverHome({ located, issue }: LocationState) {
  const insets = useSafeAreaInsets();
  const { spacing, gutter } = useTheme();
  const styles = useStyles();
  const access = usePublishAccess();
  const myTrips = useMyTrips();
  const [panelHeight, setPanelHeight] = useState(0);
  // Like the passenger home: a trip is drawn on the map only once touched in the panel.
  const [openId, setOpenId] = useState<number | null>(null);
  // Coming and on-the-road trips, soonest first (only he sees them).
  const activeTrips = useMemo(
    () => (myTrips.data ?? []).filter((t) => ACTIVE_TRIP_STATUSES.includes(t.statut)).sort((a, b) => a.dateDepart.localeCompare(b.dateDepart)),
    [myTrips.data],
  );
  const openTrip = activeTrips.find((t) => t.id === openId) ?? null;
  const fit = useMemo<MapFit | null>(
    () =>
      openTrip && panelHeight > 0
        ? {
            coordinates: openTrip.chemin,
            insets: { top: insets.top + spacing[10] * 2, bottom: panelHeight + spacing[8], left: gutter, right: gutter },
          }
        : null,
    [openTrip, panelHeight, insets.top, spacing, gutter],
  );

  return (
    <View style={styles.container}>
      <AppMap showUserLocation={located} fit={fit}>
        {/*
          Only the touched trip. Fixed ids: going from one trip to another only moves the
          shapes (new ids would remove and add Mapbox sources in the same frame: "Source …
          is not in style"). Route then points, mounted together in this order: points on top.
        */}
        {openTrip ? <RouteLine id="driver-trip" coordinates={openTrip.chemin} /> : null}
        {openTrip ? <PlaceLabel id="driver-trip-depart" coordinate={openTrip.chemin[0]} label="Départ" /> : null}
        {openTrip ? <PlaceLabel id="driver-trip-arrivee" coordinate={openTrip.chemin[openTrip.chemin.length - 1]} label="Arrivée" /> : null}
      </AppMap>
      {/* No position: a veil over the whole map (under the panel, drawn after it), the card's text and buttons on top. */}
      {issue ? <LocationVeil home="driver" /> : null}
      <View style={styles.driverPanel} onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}>
        <DriverHomePanel access={access} trips={activeTrips} openId={openId} onToggle={(id) => setOpenId((current) => (current === id ? null : id))} />
      </View>
      {issue ? (
        // In the middle of the map part left free by the panel.
        <View style={[styles.promptArea, { top: insets.top + spacing[10], bottom: panelHeight }]} pointerEvents="box-none">
          <LocationPrompt issue={issue} plain short={activeTrips.length > MANY_TRIPS} />
        </View>
      ) : null}
    </View>
  );
}

/** Styles recalculés seulement quand le mode (clair/sombre) change. */
function useStyles() {
  const theme = useTheme();
  return useMemo(() => createStyles(theme), [theme]);
}

const createStyles = ({ colors, typography, spacing, gutter, radii, shadows }: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    promptArea: { position: 'absolute', left: 0, right: 0, justifyContent: 'center', paddingHorizontal: gutter },
    // Attached to the screen edges, right on the tab bar: a sheet, like the passenger home.
    driverPanel: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: gutter,
      paddingVertical: spacing[4],
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      borderTopWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      boxShadow: shadows.card,
    },
    devLinks: {
      position: 'absolute',
      right: gutter,
      flexDirection: 'row',
      gap: spacing[2],
    },
    devLink: {
      ...typography.label,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radii.full,
      overflow: 'hidden',
      color: colors.onInverse,
      backgroundColor: colors.inverseSurface,
    },
  });
