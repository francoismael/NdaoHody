import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DriverApplicationCard } from '@/features/verification';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, Icon } from '@/shared/ui';

import type { PublishBlocker } from '../rules';

/** Why the driver cannot publish yet, and the one action that fixes it. */
export function PublishBlockedCard({ blocker }: { blocker: PublishBlocker }) {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={s.wrapper}>
      <View style={s.why}>
        <Icon name="lock" tone="muted" />
        <Text style={s.whyText}>Seul un chauffeur vérifié, avec un véhicule validé, peut publier un trajet.</Text>
      </View>
      {blocker === 'not_validated' ? (
        <DriverApplicationCard />
      ) : (
        <View style={s.card}>
          <Text style={s.title} accessibilityLiveRegion="polite">
            Ton véhicule est en cours de vérification. Tu pourras publier dès qu’il sera validé.
          </Text>
          <Button label="Voir mon dossier" onPress={() => router.push('/pending-validation')} />
        </View>
      )}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    wrapper: { gap: spacing[3] },
    why: { flexDirection: 'row', gap: spacing[2], alignItems: 'flex-start' },
    whyText: { ...typography.small, color: colors.textMuted, flex: 1 },
    card: { padding: spacing[4], gap: spacing[3], borderRadius: radii.md, backgroundColor: colors.accentSurface, borderWidth: 1, borderColor: colors.accentBorder },
    title: { ...typography.bodyStrong, color: colors.text },
  });
