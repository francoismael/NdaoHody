import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';

import { FieldMessage } from './FieldMessage';

export type CodeInputProps = {
  /** Read by TalkBack, e.g. "Code à 6 chiffres reçu par SMS". */
  label: string;
  value: string;
  /** Called with digits only, never longer than `length`. */
  onChangeText: (code: string) => void;
  length?: number;
  /** A new error makes the boxes shake (unless "reduce motion" is on). */
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
};

/**
 * CodeOtp du PWA. ONE invisible input over the boxes takes the whole keyboard,
 * the long-press paste and the SMS autofill (sms-otp on Android, oneTimeCode on iOS).
 * The boxes only draw the digits: no focus juggling, backspace just works.
 */
export function CodeInput({ label, value, onChangeText, length = 6, error, disabled = false, autoFocus = true }: CodeInputProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error) return;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      const step = (toValue: number) => Animated.timing(shake, { toValue, duration: 50, useNativeDriver: true });
      Animated.sequence([step(10), step(-10), step(8), step(-8), step(4), step(0)]).start();
    });
    return () => {
      cancelled = true;
    };
  }, [error, shake]);

  // Pasted text may contain spaces or words ("Ton code : 123 456"): keep the digits.
  const change = (text: string) => onChangeText(text.replace(/\D/g, '').slice(0, length));
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View style={s.wrapper}>
      <Animated.View style={[s.row, { transform: [{ translateX: shake }] }]}>
        <View style={s.cells} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {Array.from({ length }, (_, i) => (
            <View
              key={i}
              style={[s.cell, focused && i === activeIndex && s.cellActive, Boolean(error) && s.cellError, disabled && s.cellDisabled]}
            >
              <Text style={s.digit}>{value[i] ?? ''}</Text>
            </View>
          ))}
        </View>
        <TextInput
          style={s.hiddenInput}
          value={value}
          onChangeText={change}
          editable={!disabled}
          autoFocus={autoFocus}
          keyboardType="number-pad"
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          caretHidden
          selectionColor="transparent"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          accessibilityValue={{ text: value.length ? `${value.length} chiffre(s) sur ${length}` : 'vide' }}
          accessibilityHint={error ?? undefined}
        />
      </Animated.View>
      {error ? <FieldMessage tone="danger" message={error} /> : null}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii, controlHeight }: Theme) =>
  StyleSheet.create({
    wrapper: { gap: spacing[3] },
    row: { position: 'relative' },
    cells: { flexDirection: 'row', gap: spacing[2] },
    cell: {
      flex: 1,
      height: controlHeight + spacing[2],
      borderRadius: radii.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellActive: { borderColor: colors.accent },
    cellError: { borderColor: colors.danger },
    cellDisabled: { opacity: 0.45 },
    digit: { ...typography.number, color: colors.text },
    // Covers the boxes so a tap or a long press anywhere reaches it; its text is never seen.
    hiddenInput: { ...StyleSheet.absoluteFill, color: 'transparent', backgroundColor: 'transparent', opacity: 0.02 },
  });
