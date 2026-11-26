import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Avis } from '@contract';

import { useTheme, type Theme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { currentTime, formatDay } from '@/shared/utils';

type ReviewItemProps = { review: Pick<Avis, 'note' | 'commentaire' | 'dateAvis'> };

/**
 * One passenger's review: his stars, the day, his words. No author name:
 * the contract `Avis` only carries `auteurId` (only passengers rate).
 */
export function ReviewItem({ review }: ReviewItemProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const day = formatDay(new Date(review.dateAvis), currentTime());

  return (
    <View style={s.card} accessible accessibilityLabel={[`${review.note} sur 5, ${day}`, review.commentaire].filter(Boolean).join('. ')}>
      <View style={s.top}>
        <View style={s.note}>
          <Icon name="star" size="sm" tone="accent" />
          <Text style={s.noteText}>{review.note}</Text>
        </View>
        <Text style={s.day}>{day}</Text>
      </View>
      {review.commentaire ? <Text style={s.comment}>{`« ${review.commentaire} »`}</Text> : null}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    card: {
      padding: spacing[4],
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      gap: spacing[2],
    },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
    note: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
    noteText: { ...typography.bodyStrong, color: colors.text },
    day: { ...typography.small, color: colors.textMuted },
    comment: { ...typography.body, color: colors.text },
  });
