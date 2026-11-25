import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { useTheme, type Theme } from '@/shared/theme';
import { Button } from '@/shared/ui';

import { useDriverStep } from '../hooks/useVerification';
import type { DriverStep } from '../rules';

const CARDS: Record<Exclude<DriverStep, 'validated'>, { title: string; action: string; href: Href }> = {
  documents: { title: 'Deviens chauffeur vérifié : envoie ton permis et un selfie.', action: 'Commencer mon dossier', href: '/verification' },
  vehicle: { title: 'Encore une étape : ton véhicule.', action: 'Ajouter mon véhicule', href: '/vehicle' },
  pending: { title: 'Ton dossier est en cours de vérification.', action: 'Voir mon dossier', href: '/pending-validation' },
  refused: { title: 'Ton dossier doit être corrigé.', action: 'Voir le motif', href: '/pending-validation' },
  suspended: { title: 'Ton activité de chauffeur est suspendue.', action: 'Voir mon dossier', href: '/pending-validation' },
};

/** Driver home: where the application stands and the one next action. Nothing once validated. */
export function DriverApplicationCard() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { step } = useDriverStep();

  if (step === null || step === 'validated') return null;
  const card = CARDS[step];

  return (
    <View style={s.card} accessible={false}>
      <Text style={s.title} accessibilityLiveRegion="polite">
        {card.title}
      </Text>
      <Button label={card.action} onPress={() => router.push(card.href)} />
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    card: { padding: spacing[4], gap: spacing[3], borderRadius: radii.md, backgroundColor: colors.accentSurface, borderWidth: 1, borderColor: colors.accentBorder },
    title: { ...typography.bodyStrong, color: colors.text },
  });
