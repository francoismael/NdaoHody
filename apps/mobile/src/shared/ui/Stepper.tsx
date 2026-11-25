import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';

import { FieldMessage } from './FieldMessage';
import { useFormErrorTarget } from './formErrors';

export type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  error?: string | null;
  hint?: string;
};

/** A small whole number with − and + (Compteur of the PWA). TalkBack: swipe up or down to change it. */
export function Stepper({ label, value, min, max, onChange, disabled = false, error, hint }: StepperProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const errorTarget = useFormErrorTarget(Boolean(error));
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && value < max;

  return (
    <View ref={errorTarget} style={s.wrapper}>
      <Text style={s.label} importantForAccessibility="no" accessibilityElementsHidden>
        {label}
      </Text>
      <View
        style={[s.box, disabled && s.dimmed, Boolean(error) && s.error]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        accessibilityState={{ disabled }}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (disabled) return;
          set(event.nativeEvent.actionName === 'increment' ? value + 1 : value - 1);
        }}
      >
        <Pressable style={s.button} onPress={() => set(value - 1)} disabled={!canDecrease} importantForAccessibility="no">
          <Text style={[s.sign, !canDecrease && s.signOff]}>−</Text>
        </Pressable>
        <Text style={s.value}>{value}</Text>
        <Pressable style={s.button} onPress={() => set(value + 1)} disabled={!canIncrease} importantForAccessibility="no">
          <Text style={[s.sign, !canIncrease && s.signOff]}>+</Text>
        </Pressable>
      </View>
      {error ? <FieldMessage tone="danger" message={error} /> : hint ? <FieldMessage tone="muted" message={hint} /> : null}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii, controlHeight }: Theme) =>
  StyleSheet.create({
    wrapper: { gap: spacing[2] },
    label: { ...typography.bodyStrong, color: colors.text },
    box: {
      minHeight: controlHeight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    error: { borderColor: colors.danger },
    dimmed: { opacity: 0.5 },
    button: { width: controlHeight, minHeight: controlHeight, alignItems: 'center', justifyContent: 'center' },
    sign: { ...typography.heading, color: colors.accent },
    signOff: { color: colors.textSubtle },
    value: { ...typography.number, color: colors.text },
  });
