import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';

import { Icon } from './Icon';

export type PromptCardProps = {
  /** Left out: a plain card, only the text and the actions (no icon, no title). */
  title?: string;
  /** Left out too: only the actions. */
  text?: string;
  /** The actions, main one first (Button). */
  children: ReactNode;
  /** No background, border nor shadow: the screen behind gives the backdrop (e.g. a veil over the map). */
  bare?: boolean;
};

/**
 * A card that asks for something before the system does (position, notifications):
 * an info icon, why it matters, and the actions. Not wider than a dialog.
 */
export function PromptCard({ title, text, children, bare = false }: PromptCardProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[s.card, bare && s.cardBare]} accessibilityRole="alert">
      {title ? (
        <>
          <View style={s.tile}>
            <Icon name="info-circle" size="lg" tone="accent" />
          </View>
          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
        </>
      ) : null}
      {text ? <Text style={s.text}>{text}</Text> : null}
      <View style={s.actions}>{children}</View>
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
    cardBare: { backgroundColor: 'transparent', borderColor: 'transparent', boxShadow: [] },
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
