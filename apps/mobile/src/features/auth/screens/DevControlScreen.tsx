import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';
import { Button, ShellScreen } from '@/shared/ui';

import { useResetDemo } from '../hooks/useResetDemo';
import { useSession } from '../hooks/useSession';

/**
 * PROVISOIRE (R1) : interrupteurs de la session simulée.
 * Le panneau de démo (route `demo`, R3) joue l'autre personne ; cet écran garde la session. Retiré en R32.
 */
export function DevControlScreen() {
  const { signedIn, isDriver, signIn, signOut, setRole } = useSession();
  const resetDemo = useResetDemo();
  const router = useRouter();
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
          onValueChange={(on) => setRole(on ? 'chauffeur' : 'passager')}
          trackColor={track}
          thumbColor={theme.colors.surface}
          accessibilityLabel="Rôle chauffeur"
        />
      </View>
      <Button label="Ouvrir le panneau de démo" onPress={() => router.push('/demo')} hint="Jouer l’autre personne, changer la vitesse" />
      <Button
        label="Remettre la démo à zéro"
        variant="secondary"
        loading={resetDemo.isPending}
        onPress={() => resetDemo.mutate()}
        hint="Données de départ, cache vidé, déconnexion"
      />
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
