import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UserBadge, toDisplayBadge } from '@/features/profile';
import { useTheme, type Theme } from '@/shared/theme';
import { Avatar, Button, Icon } from '@/shared/ui';
import { formatDuration } from '@/shared/utils';

import type { PassingDriver } from '../types';

type PassingDriverRowProps = {
  driver: PassingDriver;
  /** 1 = the soonest: the same number is drawn on the map. */
  rank: number;
  selected: boolean;
  onSelect: () => void;
  onBook: () => void;
};

const seatsText = (n: number): string => (n > 1 ? `${n} places libres` : '1 place libre');

const ratingText = (note: number | null, count: number): string =>
  note === null ? 'Pas encore noté' : `${note.toFixed(1).replace('.', ',')} · ${count} avis`;

function vehicleText({ type, marque, modele, couleur }: PassingDriver['vehicule']): string {
  const name = [marque, modele].filter(Boolean).join(' ') || (type === 'moto' ? 'Moto' : 'Voiture');
  return `${name} · ${couleur}`;
}

/** One driver passing near the passenger: his trip on top; below, who he is and when he passes. */
export function PassingDriverRow({ driver, rank, selected, onSelect, onBook }: PassingDriverRowProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { chauffeur, vehicule, trajet, arriveeDansMinutes } = driver;
  const minutes = formatDuration(arriveeDansMinutes * 60);
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
        accessibilityLabel={`${rank}. ${chauffeur.prenom}, de ${trajet.depart.libelle} vers ${trajet.arrivee.libelle}, passe dans ${minutes}, ${seats}, ${rating}, ${vehicleText(vehicule)}`}
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
            <Text style={s.whenLabel}>passe dans</Text>
            <Text style={s.minutes}>{minutes}</Text>
            <Text style={s.seats}>{seats}</Text>
          </View>
        </View>
      </Pressable>
      {selected ? <Button label="Réserver une place" onPress={onBook} /> : null}
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
  });
