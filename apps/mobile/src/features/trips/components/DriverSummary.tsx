import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { UserBadge, formatRating, toDisplayBadge, vehicleText } from '@/features/profile';
import { useTheme, type Theme } from '@/shared/theme';
import { Avatar, Icon } from '@/shared/ui';

import type { DriverCardData } from '../types';

export const seatsText = (n: number): string => (n > 1 ? `${n} places libres` : '1 place libre');

export const ratingText = (note: number | null, count: number): string =>
  note === null ? 'Pas encore noté' : `${formatRating(note)} · ${count} avis`;

/** What a screen reader says for the summary (the summary itself is hidden from it). */
export function driverSummaryLabel({ chauffeur, vehicule, trajet }: DriverCardData, when: { label: string; value: string }): string {
  return `${chauffeur.prenom}, ${when.label} ${when.value}, ${seatsText(trajet.placesLibres)}, ${ratingText(chauffeur.noteMoyenne, chauffeur.nombreNotes)}, ${vehicleText(vehicule)}`;
}

type DriverSummaryProps = {
  driver: DriverCardData;
  /** When he passes the passenger: "passe dans" + "6 min", or "passe demain" + "07:42". */
  when: { label: string; value: string };
  /** 1: each text on one line (a card not chosen); undefined: nothing is cut. */
  lines?: number;
};

/**
 * Who the driver is and when he passes, in one row: photo + badge; name, rating, vehicle;
 * then the minutes and seats. Home and search cards, and the booking window.
 */
export function DriverSummary({ driver, when, lines }: DriverSummaryProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { chauffeur, vehicule, trajet } = driver;
  return (
    <View style={s.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={s.face}>
        <Avatar name={chauffeur.prenom} photoUrl={chauffeur.photoUrl} />
        {/* Tag hugs its text (alignSelf flex-start): this centered box puts it under the photo. */}
        <View style={s.badge}>
          <UserBadge badge={toDisplayBadge(chauffeur.badge)} />
        </View>
      </View>
      <View style={s.who}>
        <Text style={s.name} numberOfLines={lines}>
          {chauffeur.prenom}
        </Text>
        {chauffeur.noteMoyenne === null ? (
          <Text style={s.meta} numberOfLines={lines}>
            {ratingText(null, 0)}
          </Text>
        ) : (
          // Like the driver's profile: the number, then the star, then the reviews count.
          <View style={s.iconLine}>
            <Text style={s.meta}>{formatRating(chauffeur.noteMoyenne)}</Text>
            <Icon name="star" size="sm" tone="muted" />
            <Text style={s.meta} numberOfLines={lines}>
              {`· ${chauffeur.nombreNotes} avis`}
            </Text>
          </View>
        )}
        <View style={s.iconLine}>
          <Icon name={vehicule.type === 'moto' ? 'motorbike' : 'car'} size="sm" tone="muted" />
          <Text style={s.meta} numberOfLines={lines}>
            {vehicleText(vehicule)}
          </Text>
        </View>
      </View>
      <View style={s.when}>
        <Text style={s.whenLabel}>{when.label}</Text>
        <Text style={s.minutes}>{when.value}</Text>
        <Text style={s.seats}>{seatsText(trajet.placesLibres)}</Text>
      </View>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
    who: { flex: 1, gap: spacing[1] },
    face: { alignItems: 'center', gap: spacing[1] },
    badge: { alignItems: 'center' },
    name: { ...typography.bodyStrong, color: colors.text },
    iconLine: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
    meta: { ...typography.small, color: colors.textMuted, flexShrink: 1 },
    when: { alignItems: 'flex-end' },
    whenLabel: { ...typography.caption, color: colors.textMuted },
    minutes: { ...typography.number, color: colors.accent },
    seats: { ...typography.caption, color: colors.text },
  });
