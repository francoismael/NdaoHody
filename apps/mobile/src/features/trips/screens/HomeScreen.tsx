import { useMemo } from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppMap, useLocationPermission } from '@/shared/map';
import { useTheme, type Theme } from '@/shared/theme';

// Sur Android, la boîte système a son propre texte : on explique donc AVANT de demander.
const WHY_LOCATION =
  "NdaoHody utilise ta position pour te montrer les trajets près de toi et définir tes points de départ et d'arrivée.";
const DENIED_LOCATION =
  "Position désactivée : la carte reste centrée sur Tana. Tu peux continuer à utiliser l'app.";

const GPS_OFF =
  'La localisation de ton téléphone est coupée : active-la pour voir ta position sur la carte.';

export function HomeScreen() {
  const { status, canAskAgain, request, servicesEnabled, enableServices } = useLocationPermission();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <AppMap showUserLocation={status === 'granted' && servicesEnabled} />

      {/* PROVISOIRE (session 3) : accès à l'écran de contrôle du thème, en dev seulement. */}
      {__DEV__ && (
        <Link href="/theme-preview" style={styles.devLink}>
          Thème
        </Link>
      )}

      {status === 'undetermined' && (
        <LocationPanel text={WHY_LOCATION} action="Autoriser ma position" onPress={request} />
      )}
      {status === 'denied' && (
        <LocationPanel
          text={DENIED_LOCATION}
          action={canAskAgain ? 'Réessayer' : 'Ouvrir les réglages'}
          onPress={request}
        />
      )}
      {status === 'granted' && !servicesEnabled && (
        <LocationPanel text={GPS_OFF} action="Activer la localisation" onPress={enableServices} />
      )}
    </View>
  );
}

type LocationPanelProps = { text: string; action: string; onPress: () => void };

function LocationPanel({ text, action, onPress }: LocationPanelProps) {
  const styles = useStyles();
  return (
    <View style={styles.panel}>
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
    devLink: {
      ...typography.label,
      position: 'absolute',
      top: spacing[4],
      right: gutter,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radii.full,
      overflow: 'hidden',
      color: colors.onInverse,
      backgroundColor: colors.inverseSurface,
    },
  });
