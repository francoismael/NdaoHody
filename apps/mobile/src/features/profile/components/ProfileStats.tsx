import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';

import { formatRating } from '../services/profileService';

export type ProfileStat = {
  key: string;
  value: string;
  /** Icon right after the value (the rating's star). */
  icon?: IconName;
  label: string;
  accessibilityLabel: string;
};

/**
 * THE rating tile: decimal average and number of reviews together.
 * No review = "Pas encore d'avis", never 0 stars (the server sends noteMoyenne null).
 */
export function ratingStat(noteMoyenne: number | null, nombreNotes: number): ProfileStat {
  if (noteMoyenne === null || nombreNotes === 0) {
    return { key: 'rating', value: '—', label: 'Pas encore d’avis', accessibilityLabel: 'Pas encore d’avis' };
  }
  const note = formatRating(noteMoyenne);
  return { key: 'rating', value: note, icon: 'star', label: `Note · ${nombreNotes} avis`, accessibilityLabel: `Note ${note} sur 5, ${nombreNotes} avis` };
}

/** Rides tile: the count comes from the server, the screen never recounts. */
export function ridesStat(count: number, label: string, accessibilityLabel: string): ProfileStat {
  return { key: 'rides', value: String(count), label, accessibilityLabel };
}

/** The figures under a profile header, side by side (my profile and the driver's public profile). */
export function ProfileStats({ items }: { items: readonly ProfileStat[] }) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={s.stats}>
      {items.map((item) => (
        <View key={item.key} style={s.stat} accessible accessibilityLabel={item.accessibilityLabel}>
          <View style={s.valueRow}>
            <Text style={s.statValue}>{item.value}</Text>
            {item.icon ? <Icon name={item.icon} /> : null}
          </View>
          <Text style={s.statLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    stats: { flexDirection: 'row', gap: spacing[3] },
    stat: {
      flex: 1,
      padding: spacing[4],
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      gap: spacing[1],
    },
    statValue: { ...typography.number, color: colors.text },
    valueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
    statLabel: { ...typography.small, color: colors.textMuted },
  });
