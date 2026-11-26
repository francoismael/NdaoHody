import { useMemo, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Vehicule } from '@contract';

import { vehicleText } from '@/features/profile';
import { useTheme, type Theme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

const seatsText = (n: number): string => (n > 1 ? `${n} places passagers` : '1 place passager');

export type VehicleCardProps = {
  vehicle: Vehicule;
  /** Chosen among several (publish): accent border, like a chosen driver card. */
  selected?: boolean;
  /** Makes the whole card a choice (publish); without it the card only shows. */
  onPress?: () => void;
  /** Under the vehicle (Mes véhicules: status, reason, buttons). */
  children?: ReactNode;
};

/** One vehicle: photo, "Toyota Corolla · Grise", plate and seats. "Mes véhicules" and publish. */
export function VehicleCard({ vehicle, selected = false, onPress, children }: VehicleCardProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  // Seeded demo photos are not real pictures (mock://): an icon instead.
  const hasPicture = vehicle.photoUrl.startsWith('file:');
  const label = `${vehicleText(vehicle)}, ${vehicle.immatriculation}, ${seatsText(vehicle.places)}`;

  const row = (
    <View style={s.row}>
      {hasPicture ? (
        <Image source={{ uri: vehicle.photoUrl }} style={s.thumb} accessibilityLabel={`Photo du véhicule ${vehicle.immatriculation}`} />
      ) : (
        <View style={[s.thumb, s.center]}>
          <Icon name={vehicle.type === 'moto' ? 'motorbike' : 'car'} tone="muted" />
        </View>
      )}
      <View style={s.info}>
        <Text style={s.name}>{vehicleText(vehicle)}</Text>
        <Text style={s.meta}>
          {vehicle.immatriculation} · {seatsText(vehicle.places)}
        </Text>
      </View>
      {onPress && selected ? <Icon name="circle-check" tone="accent" /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={label}
        style={({ pressed }) => [s.card, selected && s.selected, pressed && !selected && s.pressed]}
      >
        {row}
        {children}
      </Pressable>
    );
  }
  return (
    <View style={s.card}>
      {row}
      {children}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    card: { gap: spacing[3], padding: spacing[3], borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder },
    selected: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSurface },
    pressed: { borderColor: colors.borderStrong },
    center: { alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row', gap: spacing[3], alignItems: 'center' },
    thumb: { width: 88, aspectRatio: 4 / 3, borderRadius: radii.sm, backgroundColor: colors.fill },
    info: { flex: 1, gap: spacing[1] },
    name: { ...typography.bodyStrong, color: colors.text },
    meta: { ...typography.small, color: colors.textMuted },
  });
