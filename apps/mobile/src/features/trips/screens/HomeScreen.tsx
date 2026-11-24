import { useMemo } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth';
import { AppMap, useLocationPermission } from '@/shared/map';
import { useTheme, type Theme } from '@/shared/theme';
import { Button } from '@/shared/ui';

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
  const { spacing } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <AppMap showUserLocation={status === 'granted' && servicesEnabled} />

      {/* PROVISOIRE (R1) : coquille de l'accueil de chaque rôle et liens vers ses écrans. */}
      <View style={[styles.shell, { top: insets.top + spacing[10] + spacing[4] }]}>
        <Text style={styles.shellTitle} accessibilityRole="header">
          {isDriver ? 'Accueil chauffeur' : 'Accueil passager'}
        </Text>
        <Text style={styles.shellNote}>Coquille : contenu en {isDriver ? 'R8' : 'R12'}</Text>
        {isDriver ? (
          <>
            <Button label="Mes trajets" onPress={() => router.push('/my-trips')} />
            <Button label="Demande reçue" onPress={() => router.push('/request/demo')} variant="secondary" />
            <Button label="Course en cours" onPress={() => router.push('/driving/demo')} variant="secondary" />
            <Button label="Vérification" onPress={() => router.push('/verification')} variant="ghost" />
          </>
        ) : (
          <Button label="Rechercher un trajet" onPress={() => router.push('/search')} />
        )}
      </View>

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
