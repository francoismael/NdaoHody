import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type ColorRole, type Theme } from '@/shared/theme';

import { Icon, type IconName, type IconTone } from './Icon';

export type TagTone = 'accent' | 'info' | 'neutral';

export type TagProps = {
  label: string;
  tone?: TagTone;
  icon?: IconName;
  /** Makes the tag a small button, same size (e.g. "Définir par défaut"). */
  onPress?: () => void;
  /** A small spinner in place of the icon while the action runs (the tag keeps its size). */
  loading?: boolean;
};

type ToneRoles = { background: ColorRole; text: ColorRole; icon: IconTone };

const tones: Record<TagTone, ToneRoles> = {
  accent: { background: 'accentSurface', text: 'accent', icon: 'accent' },
  info: { background: 'infoSurface', text: 'text', icon: 'default' },
  neutral: { background: 'fill', text: 'textMuted', icon: 'muted' },
};

/** Small label next to a name (badge, status). The words carry the meaning, not the color. */
export function Tag({ label, tone = 'neutral', icon, onPress, loading = false }: TagProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const roles = tones[tone];
  const content = (
    <>
      {loading ? (
        <View style={s.spinnerBox}>
          <ActivityIndicator size="small" color={theme.colors[roles.text]} style={s.spinner} />
        </View>
      ) : (
        icon && <Icon name={icon} size="sm" tone={roles.icon} />
      )}
      <Text style={[s.text, { color: theme.colors[roles.text] }]}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy: loading, disabled: loading }}
        hitSlop={8}
        style={({ pressed }) => [s.tag, { backgroundColor: theme.colors[pressed ? 'borderStrong' : roles.background] }]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={[s.tag, { backgroundColor: theme.colors[roles.background] }]}>{content}</View>;
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
    // Same box as a small icon (16), so the tag does not grow while it loads.
    spinnerBox: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
    spinner: { transform: [{ scale: 0.7 }] },
    // Caption size, semi-bold: the weight lives in the font name.
    text: { ...typography.caption, fontFamily: fontFamilies.semiBold },
  });
