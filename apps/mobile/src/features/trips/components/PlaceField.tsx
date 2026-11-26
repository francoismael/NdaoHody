import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

export type PlaceFieldProps = { label: string; value: string; onPress: () => void; disabled?: boolean };

/** A field that opens the place picker (looks like a TextField, behaves like a button). Publish and search. */
export function PlaceField({ label, value, onPress, disabled = false }: PlaceFieldProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      accessibilityHint="Ouvre la liste des lieux"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [s.row, pressed && s.rowPressed, disabled && s.rowDisabled]}
    >
      <View style={s.rowText}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Icon name="chevron-right" tone="muted" />
    </Pressable>
  );
}

const createStyles = ({ colors, typography, spacing, radii, controlHeight }: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: controlHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    rowPressed: { borderColor: colors.borderStrong },
    rowDisabled: { opacity: 0.5 },
    rowText: { flex: 1 },
    rowLabel: { ...typography.caption, color: colors.textMuted },
    rowValue: { ...typography.bodyStrong, color: colors.text },
  });
