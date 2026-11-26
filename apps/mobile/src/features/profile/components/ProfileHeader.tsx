import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';
import { Avatar } from '@/shared/ui';

import type { DisplayBadge } from '../services/profileService';
import { UserBadge } from './UserBadge';

type ProfileHeaderProps = {
  name: string;
  photoUrl: string | null;
  /** From `visibleBadge` (my profile) or `toDisplayBadge` (a driver); null = no badge. */
  badge: DisplayBadge | null;
  /** Small lines under the badge (phone, member since, vehicle…). */
  meta?: readonly string[];
};

/** THE profile header: photo, name, badge, meta lines. Shared by my profile and the driver's public profile. */
export function ProfileHeader({ name, photoUrl, badge, meta = [] }: ProfileHeaderProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={s.head}>
      <Avatar name={name} photoUrl={photoUrl} size="lg" />
      <Text style={s.name} accessibilityRole="header">
        {name}
      </Text>
      {badge ? (
        // The tag sizes itself to its text (alignSelf flex-start): this box centers it.
        <View style={s.badge}>
          <UserBadge badge={badge} />
        </View>
      ) : null}
      {meta.map((line) => (
        <Text key={line} style={s.meta}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing }: Theme) =>
  StyleSheet.create({
    head: { alignItems: 'center', gap: spacing[2] },
    badge: { alignItems: 'center' },
    name: { ...typography.title, color: colors.text, textAlign: 'center' },
    meta: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
  });
