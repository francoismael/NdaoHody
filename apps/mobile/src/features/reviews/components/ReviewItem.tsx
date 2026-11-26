import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';
import { Avatar, RatingStars } from '@/shared/ui';
import { formatShortDate } from '@/shared/utils';

import type { ReviewWithAuthor } from '../types';

type ReviewItemProps = { review: Pick<ReviewWithAuthor, 'note' | 'commentaire' | 'dateAvis' | 'auteur'> };

/** One passenger's review: his photo; his first name; his words; his stars and the date, small. */
export function ReviewItem({ review }: ReviewItemProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const name = review.auteur.prenom || 'Passager';
  const date = formatShortDate(new Date(review.dateAvis));

  return (
    <View
      style={s.card}
      accessible
      accessibilityLabel={[`${name}, ${review.note} sur 5`, review.commentaire, date].filter(Boolean).join('. ')}
    >
      <Avatar name={name} photoUrl={review.auteur.photoUrl} />
      <View style={s.body}>
        <Text style={s.name} numberOfLines={1}>
          {name}
        </Text>
        {review.commentaire ? <Text style={s.comment}>{review.commentaire}</Text> : null}
        <View style={s.bottom}>
          <RatingStars value={review.note} />
          <Text style={s.date}>{date}</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[3],
      padding: spacing[4],
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    body: { flex: 1, gap: spacing[1] },
    bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    name: { ...typography.bodyStrong, color: colors.text },
    comment: { ...typography.body, color: colors.text },
    date: { ...typography.small, color: colors.textMuted },
  });
