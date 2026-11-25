import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type ColorRole, type Theme } from '@/shared/theme';

import { Icon, type IconName, type IconTone } from './Icon';

export type FlashTone = 'success' | 'info' | 'danger';

export type FlashProps = {
  message: string;
  tone?: FlashTone;
};

type ToneRoles = { background: ColorRole; border: ColorRole; icon: IconName; iconTone: IconTone };

const tones: Record<FlashTone, ToneRoles> = {
  success: { background: 'accentSurface', border: 'accentBorder', icon: 'circle-check', iconTone: 'accent' },
  info: { background: 'infoSurface', border: 'border', icon: 'info-circle', iconTone: 'default' },
  danger: { background: 'dangerSurface', border: 'dangerBorder', icon: 'alert-circle', iconTone: 'danger' },
};

/**
 * Flash / Banniere du PWA: a message about the whole screen (code sent, network down).
 * Stays in place (no timer): a message that disappears may never be read.
 */
export function Flash({ message, tone = 'info' }: FlashProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const roles = tones[tone];

  return (
    <View
      style={[s.box, { backgroundColor: theme.colors[roles.background], borderColor: theme.colors[roles.border] }]}
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
    >
      <Icon name={roles.icon} tone={roles.iconTone} />
      <Text style={s.text}>{message}</Text>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    box: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[3],
      padding: spacing[4],
      borderRadius: radii.md,
      borderWidth: 1,
    },
    text: { ...typography.body, color: colors.text, flexShrink: 1 },
  });
