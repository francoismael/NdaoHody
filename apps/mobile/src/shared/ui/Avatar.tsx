import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';

export type AvatarSize = 'md' | 'lg';

export type AvatarProps = {
  /** Full name: gives the initials and the spoken label. */
  name: string;
  photoUrl?: string | null;
  size?: AvatarSize;
};

const sizes: Record<AvatarSize, number> = { md: 48, lg: 88 };

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

/** Photo of a person, or their initials when there is none. */
export function Avatar({ name, photoUrl, size = 'md' }: AvatarProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const px = sizes[size];
  const box = { width: px, height: px, borderRadius: px / 2 };

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[s.base, box]} accessibilityLabel={`Photo de ${name}`} />;
  }
  return (
    <View style={[s.base, box]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[size === 'lg' ? s.initialsLarge : s.initials]}>{initialsOf(name)}</Text>
    </View>
  );
}

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    base: { backgroundColor: colors.accentSurfaceStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    initials: { ...typography.subheading, color: colors.accentStrong },
    initialsLarge: { ...typography.title, color: colors.accentStrong },
  });
