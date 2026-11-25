import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';

import { FieldMessage } from './FieldMessage';
import { useFormErrorTarget } from './formErrors';
import { Icon, type IconName } from './Icon';

export type ChoiceOption<T extends string> = { value: T; label: string; icon?: IconName };

export type ChoiceGroupProps<T extends string> = {
  /** Visible question above the choices, also read by TalkBack. */
  label: string;
  options: readonly ChoiceOption<T>[];
  /** null: nothing chosen yet. */
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
  hint?: string;
  disabled?: boolean;
};

/**
 * One choice among 2 or 3, side by side (Segmente and ChoixSexe of the PWA).
 * A radio group for TalkBack: each choice says whether it is selected.
 */
export function ChoiceGroup<T extends string>({ label, options, value, onChange, error, hint, disabled = false }: ChoiceGroupProps<T>) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const errorTarget = useFormErrorTarget(Boolean(error));

  return (
    <View ref={errorTarget} style={s.wrapper}>
      <Text style={s.label} importantForAccessibility="no" accessibilityElementsHidden>
        {label}
      </Text>
      <View style={s.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              accessibilityHint={error ?? hint}
              style={({ pressed }) => [
                s.choice,
                selected && s.selected,
                Boolean(error) && !selected && s.error,
                pressed && !selected && s.pressed,
                disabled && !selected && s.dimmed,
              ]}
            >
              {option.icon ? <Icon name={option.icon} tone={selected ? 'accent' : 'muted'} /> : null}
              <Text style={[s.text, selected && s.textSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <FieldMessage tone="danger" message={error} /> : hint ? <FieldMessage tone="muted" message={hint} /> : null}
    </View>
  );
}

const createStyles = ({ colors, typography, fontFamilies, spacing, radii, controlHeight }: Theme) =>
  StyleSheet.create({
    wrapper: { gap: spacing[2] },
    label: { ...typography.bodyStrong, color: colors.text },
    row: { flexDirection: 'row', gap: spacing[3] },
    choice: {
      flex: 1,
      minHeight: controlHeight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      paddingHorizontal: spacing[3],
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    selected: { borderColor: colors.accent, backgroundColor: colors.accentSurface },
    error: { borderColor: colors.danger },
    pressed: { borderColor: colors.borderStrong },
    dimmed: { opacity: 0.5 },
    text: { ...typography.body, color: colors.text },
    textSelected: { fontFamily: fontFamilies.semiBold, color: colors.accent },
  });
