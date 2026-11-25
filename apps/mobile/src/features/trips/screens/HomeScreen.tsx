import { useMemo, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth';
import { AppMap, RouteLine, useLocationPermission, type MapFit } from '@/shared/map';
import { useTheme, type Theme } from '@/shared/theme';
import { Button } from '@/shared/ui';

import { DriverHomePanel } from '../components/DriverHomePanel';
import { usePublishAccess } from '../hooks/usePublishAccess';
import { useDemoPosition, useMyTrips, useTripsAround } from '../hooks/useTrips';
import { ACTIVE_TRIP_STATUSES } from '../rules';

// Sur Android, la boîte système a son propre texte : on explique donc AVANT de demander.
const WHY_LOCATION =
  "NdaoHody utilise ta position pour te montrer les trajets près de toi et définir tes points de départ et d'arrivée.";
const DENIED_LOCATION =
  "Position désactivée : la carte reste centrée sur Tana. Tu peux continuer à utiliser l'app.";

const GPS_OFF =
  'La localisation de ton téléphone est coupée : active-la pour voir ta position sur la carte.';

export function HomeScreen() {
  const { status, canAskAgain, request, servicesEnabled, enableServices } = useLocationPermission();
  const { isDriver } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { spacing, gutter } = useTheme();
  const styles = useStyles();
  const access = usePublishAccess();
  const myTrips = useMyTrips();
  const [panelHeight, setPanelHeight] = useState(0);
  // Driver: coming and on-the-road trips, soonest first; drawn on the map (only he sees them).
  const activeTrips = useMemo(
    () =>
      (isDriver ? (myTrips.data ?? []) : [])
        .filter((t) => ACTIVE_TRIP_STATUSES.includes(t.statut))
        .sort((a, b) => a.dateDepart.localeCompare(b.dateDepart)),
    [isDriver, myTrips.data],
  );
  const fit = useMemo<MapFit | null>(
    () =>
      activeTrips.length > 0 && panelHeight > 0
        ? {
            coordinates: activeTrips.flatMap((t) => t.chemin),
            insets: { top: insets.top + spacing[10] * 2, bottom: panelHeight + spacing[8], left: gutter, right: gutter },
          }
        : null,
    [activeTrips, panelHeight, insets.top, spacing, gutter],
  );
  // PROVISIONAL (R2 check): routes passing near the demo position. Real content in R12.
  const here = useDemoPosition();
  const around = useTripsAround(isDriver ? null : here);
  const locationTop = isDriver ? insets.top + spacing[10] + spacing[4] : null;
  const aroundNote = around.isPending
    ? 'Recherche des trajets proches…'
    : around.isError
      ? around.error.message
      : `${around.data.length} trajet(s) passent près de toi`;

  return (
    <View style={styles.container}>
      <AppMap showUserLocation={status === 'granted' && servicesEnabled} fit={fit}>
        {(isDriver ? activeTrips : (around.data ?? [])).map((trajet) => (
          <RouteLine key={trajet.id} id={`trip-${trajet.id}`} coordinates={trajet.chemin} />
        ))}
      </AppMap>

      {isDriver ? (
        <View style={styles.driverPanel} onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}>
          <DriverHomePanel access={access} trips={activeTrips} />
        </View>
      ) : (
        /* PROVISOIRE (R1) : coquille de l'accueil passager, contenu en R12. */
        <View style={[styles.shell, { top: insets.top + spacing[10] + spacing[4] }]}>
          <Text style={styles.shellTitle} accessibilityRole="header">
            Accueil passager
          </Text>
          <Text style={styles.shellNote}>Coquille : contenu en R12</Text>
          <Text style={styles.shellNote} accessibilityLiveRegion="polite">
            {aroundNote}
          </Text>
          <Button label="Rechercher un trajet" onPress={() => router.push('/search')} />
        </View>
      )}

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

      {/* The driver's panel sits at the bottom: the location panel then goes on top. */}
      {status === 'undetermined' && (
        <LocationPanel text={WHY_LOCATION} action="Autoriser ma position" onPress={request} top={locationTop} />
      )}
      {status === 'denied' && (
        <LocationPanel
          text={DENIED_LOCATION}
          action={canAskAgain ? 'Réessayer' : 'Ouvrir les réglages'}
          onPress={request}
          top={locationTop}
        />
      )}
      {status === 'granted' && !servicesEnabled && (
        <LocationPanel text={GPS_OFF} action="Activer la localisation" onPress={enableServices} top={locationTop} />
      )}
    </View>
  );
}

type LocationPanelProps = { text: string; action: string; onPress: () => void; /** null = at the bottom. */ top: number | null };

function LocationPanel({ text, action, onPress, top }: LocationPanelProps) {
  const styles = useStyles();
  return (
    <View style={[styles.panel, top !== null && { top, bottom: undefined }]}>
      <Text style={styles.panelText}>{text}</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onPress}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{action}</Text>
      </Pressable>
    </View>
  );
}

/** Styles recalculés seulement quand le mode (clair/sombre) change. */
function useStyles() {
  const theme = useTheme();
  return useMemo(() => createStyles(theme), [theme]);
}

const createStyles = ({ colors, typography, spacing, gutter, radii, shadows, controlHeight }: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    panel: {
      position: 'absolute',
      left: gutter,
      right: gutter,
      bottom: spacing[8],
      padding: spacing[4],
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      boxShadow: shadows.card,
    },
    panelText: { ...typography.body, color: colors.text, marginBottom: spacing[3] },
    button: {
      height: controlHeight,
      borderRadius: radii.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPressed: { backgroundColor: colors.primaryPressed },
    buttonText: { ...typography.bodyStrong, color: colors.onPrimary },
    driverPanel: {
      position: 'absolute',
      left: gutter,
      right: gutter,
      bottom: spacing[4],
      padding: spacing[4],
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      boxShadow: shadows.card,
    },
    shell: {
      position: 'absolute',
      left: gutter,
      right: gutter,
      gap: spacing[2],
      padding: spacing[4],
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      boxShadow: shadows.card,
    },
    shellTitle: { ...typography.heading, color: colors.text },
    shellNote: { ...typography.small, color: colors.textMuted },
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
