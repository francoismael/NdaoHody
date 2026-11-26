import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UserBadge, formatRating, toDisplayBadge, vehicleText } from '@/features/profile';
import { useTheme, type Theme } from '@/shared/theme';
import { Avatar, Icon } from '@/shared/ui';

import type { DriverCardData } from '../types';

type PassingDriverRowProps = {
  driver: DriverCardData;
  /** 1 = first in the server's order (same number on the map, at home). */
  rank: number;
  /** When he passes the passenger: "passe dans" + "6 min", or "passe demain" + "07:42". */
  when: { label: string; value: string };
  selected: boolean;
  onSelect: () => void;
  /** Lines under the driver, always shown (search: the passenger's part of the trip). */
  details?: readonly string[];
  /** One line in the accent colour under the details (search: the total price). */
  highlight?: string;
  /** Shown once the card is chosen (the buttons). */
  actions: ReactNode;
};

const seatsText = (n: number): string => (n > 1 ? `${n} places libres` : '1 place libre');

const ratingText = (note: number | null, count: number): string =>
  note === null ? 'Pas encore noté' : `${formatRating(note)} · ${count} avis`;

/**
 * One driver for the passenger (home and search): his trip on top; below, who he is and
 * when he passes; then the optional details, and the buttons once chosen.
 */
export function PassingDriverRow({ driver, rank, when, selected, onSelect, details = [], highlight, actions }: PassingDriverRowProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { chauffeur, vehicule, trajet } = driver;
  const rating = ratingText(chauffeur.noteMoyenne, chauffeur.nombreNotes);
  const seats = seatsText(trajet.placesLibres);
  // Chosen card: nothing is cut any more (one line each otherwise, like the driver home).
  const lines = selected ? undefined : 1;
  return (
    <View style={[s.card, selected && s.cardSelected]}>
      <Pressable
        style={s.pressable}
        onPress={onSelect}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={[
          `${rank}. ${chauffeur.prenom}, de ${trajet.depart.libelle} vers ${trajet.arrivee.libelle}, ${when.label} ${when.value}, ${seats}, ${rating}, ${vehicleText(vehicule)}`,
          ...details,
          ...(highlight ? [highlight] : []),
        ].join('. ')}
        accessibilityHint={selected ? undefined : 'Montre ce chauffeur sur la carte'}
      >
        {/* Top: the rank (same number as on the map) and the trip, one line, like the driver home. */}
        <View style={s.top} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <View style={s.rank}>
            <Text style={s.rankText}>{rank}</Text>
          </View>
          <Text style={s.route} numberOfLines={lines}>
            {trajet.depart.libelle} → {trajet.arrivee.libelle}
          </Text>
        </View>
        {/* Bottom: photo + badge, the driver (name, rating, vehicle), then the minutes and seats. */}
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
            <Text style={s.meta} numberOfLines={lines}>
              {rating}
            </Text>
            <View style={s.vehicleLine}>
              <Icon name={vehicule.type === 'moto' ? 'motorbike' : 'car'} size="sm" tone="muted" />
              <Text style={s.meta} numberOfLines={lines}>
                {vehicleText(vehicule)}
              </Text>
            </View>
          </View>
          <View style={s.when}>
            <Text style={s.whenLabel}>{when.label}</Text>
            <Text style={s.minutes}>{when.value}</Text>
            <Text style={s.seats}>{seats}</Text>
          </View>
        </View>
        {details.length > 0 || highlight ? (
          <View style={s.details} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {details.map((line) => (
              <Text key={line} style={s.meta} numberOfLines={lines}>
                {line}
              </Text>
            ))}
            {highlight ? <Text style={s.highlight}>{highlight}</Text> : null}
          </View>
        ) : null}
      </Pressable>
      {selected ? actions : null}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    card: {
      gap: spacing[3],
      padding: spacing[3],
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: colors.fill,
      backgroundColor: colors.fill,
    },
    cardSelected: { borderColor: colors.accent, backgroundColor: colors.accentSurface },
    pressable: { gap: spacing[2] },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
    rank: {
      width: spacing[6],
      height: spacing[6],
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    rankText: { ...typography.caption, fontFamily: typography.bodyStrong.fontFamily, color: colors.onPrimary },
    who: { flex: 1, gap: spacing[1] },
    face: { alignItems: 'center', gap: spacing[1] },
    badge: { alignItems: 'center' },
    name: { ...typography.bodyStrong, color: colors.text },
    top: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    // Same look as the driver home (DriverHomePanel tripRoute): "A → B", cut with "…".
    route: { ...typography.bodyStrong, color: colors.text, flex: 1 },
    vehicleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
    meta: { ...typography.small, color: colors.textMuted, flexShrink: 1 },
    when: { alignItems: 'flex-end' },
    whenLabel: { ...typography.caption, color: colors.textMuted },
    minutes: { ...typography.number, color: colors.accent },
    seats: { ...typography.caption, color: colors.text },
    details: { gap: spacing[1], paddingTop: spacing[2], borderTopWidth: 1, borderColor: colors.surfaceBorder },
    highlight: { ...typography.bodyStrong, color: colors.accent },
  });
