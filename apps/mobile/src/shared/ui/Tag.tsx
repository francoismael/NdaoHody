import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type ColorRole, type Theme } from '@/shared/theme';

import { Icon, type IconName, type IconTone } from './Icon';

export type TagTone = 'accent' | 'info' | 'neutral';

export type TagProps = {
  label: string;
  tone?: TagTone;
  icon?: IconName;
};

type ToneRoles = { background: ColorRole; text: ColorRole; icon: IconTone };

const tones: Record<TagTone, ToneRoles> = {
  accent: { background: 'accentSurface', text: 'accent', icon: 'accent' },
  info: { background: 'infoSurface', text: 'text', icon: 'default' },
  neutral: { background: 'fill', text: 'textMuted', icon: 'muted' },
};

/** Small label next to a name (badge, status). The words carry the meaning, not the color. */
export function Tag({ label, tone = 'neutral', icon }: TagProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const roles = tones[tone];

  return (
    <View style={[s.tag, { backgroundColor: theme.colors[roles.background] }]}>
      {icon && <Icon name={icon} size="sm" tone={roles.icon} />}
      <Text style={[s.text, { color: theme.colors[roles.text] }]}>{label}</Text>
    </View>
  );
}

const createStyles = ({ typography, fontFamilies, spacing, radii }: Theme) =>
  StyleSheet.create({
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing[1],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: radii.full,
    },
    // Caption size, semi-bold: the weight lives in the font name.
    text: { ...typography.caption, fontFamily: fontFamilies.semiBold },
  });
