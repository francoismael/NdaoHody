import { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';
import { ShellScreen } from '@/shared/ui';

import { useSession } from '../hooks/useSession';

/**
 * PROVISOIRE (R1) : interrupteurs de la session simulée.
 * Remplacé par le panneau de démo en R3, retiré en R32.
 */
export function DevControlScreen() {
  const { signedIn, isDriver, signIn, signOut, setRole } = useSession();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const track = { false: theme.colors.borderStrong, true: theme.colors.primary };

  return (
    <ShellScreen title="Écran de contrôle" session="R3">
      <View style={styles.row}>
        <Text style={styles.label}>Connecté</Text>
        <Switch
          value={signedIn}
          onValueChange={(on) => (on ? signIn() : signOut())}
          trackColor={track}
          thumbColor={theme.colors.surface}
          accessibilityLabel="Connecté"
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Rôle chauffeur</Text>
        <Switch
          value={isDriver}
          onValueChange={(on) => setRole(on ? 'driver' : 'passenger')}
          trackColor={track}
          thumbColor={theme.colors.surface}
          accessibilityLabel="Rôle chauffeur"
        />
      </View>
    </ShellScreen>
  );
}

const createStyles = ({ colors, typography, spacing, radii, controlHeight }: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: controlHeight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[4],
      borderRadius: radii.md,
      backgroundColor: colors.surface,
    },
    label: { ...typography.bodyStrong, color: colors.text },
  });
