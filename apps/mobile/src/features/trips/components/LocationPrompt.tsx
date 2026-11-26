import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';
import { Button, Icon } from '@/shared/ui';

import type { LocationIssue } from '../hooks/useLocationIssue';

type LocationPromptProps = {
  issue: LocationIssue;
  /** More actions under the main one (e.g. "Rechercher un trajet"). */
  children?: ReactNode;
};

/**
 * The position is off: a card in the middle of the map (the map stays visible around it),
 * an info icon, why it matters, and the one action that fixes it.
 */
export function LocationPrompt({ issue, children }: LocationPromptProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={s.card} accessibilityRole="alert">
      <View style={s.tile}>
        <Icon name="info-circle" size="lg" tone="accent" />
      </View>
      <Text style={s.title} accessibilityRole="header">
        {issue.title}
      </Text>
      <Text style={s.text}>{issue.text}</Text>
      <View style={s.actions}>
        <Button label={issue.action} icon={issue.icon} onPress={issue.onPress} />
        {children}
      </View>
    </View>
  );
}

/** Not wider than this on a big screen: it reads as a dialog, not a page. */
const CARD_MAX_WIDTH = 360;

const createStyles = ({ colors, typography, spacing, radii, shadows }: Theme) =>
  StyleSheet.create({
    card: {
      width: '100%',
      maxWidth: CARD_MAX_WIDTH,
      alignSelf: 'center',
      alignItems: 'center',
      gap: spacing[3],
      padding: spacing[5],
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      boxShadow: shadows.card,
    },
    tile: {
      width: spacing[10] + spacing[4],
      height: spacing[10] + spacing[4],
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSurface,
    },
    title: { ...typography.subheading, color: colors.text, textAlign: 'center' },
    text: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
    actions: { alignSelf: 'stretch', gap: spacing[2], marginTop: spacing[1] },
  });
