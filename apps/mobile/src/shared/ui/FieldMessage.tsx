import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';

import { Icon } from './Icon';

export type FieldMessageProps = {
  message: string;
  /** danger = what to fix (announced at once); muted = help. */
  tone: 'danger' | 'muted';
};

/** Erreur du PWA: the line under a field. Seen (red + icon) AND heard (live region). */
export function FieldMessage({ message, tone }: FieldMessageProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const danger = tone === 'danger';

  return (
    <View style={s.row} accessibilityLiveRegion={danger ? 'polite' : 'none'} accessibilityRole={danger ? 'alert' : undefined}>
      {danger && <Icon name="alert-circle" size="sm" tone="danger" />}
      <Text style={[s.text, danger ? s.danger : s.muted]}>{message}</Text>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
    text: { ...typography.small, flexShrink: 1 },
    danger: { color: colors.danger },
    muted: { color: colors.textMuted },
  });
