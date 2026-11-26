import { useMemo, useState, type Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';

import { FieldMessage } from './FieldMessage';
import { Icon, type IconName } from './Icon';
import { useFormErrorTarget } from './formErrors';

/** What the field holds: it decides the keyboard and the autofill (never set them by hand). */
export type TextFieldKind = 'text' | 'phone' | 'givenName' | 'familyName' | 'reference';

export type TextFieldProps = {
  /** Visible label above the field, also read by TalkBack. */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  kind?: TextFieldKind;
  /** What to fix: shown under the field (red) and announced. */
  error?: string | null;
  /** Help shown under the field when there is no error. */
  hint?: string;
  placeholder?: string;
  /** A decorative icon inside the field, on the left (e.g. "search"). */
  icon?: IconName;
  autoFocus?: boolean;
  maxLength?: number;
  /** "next" moves to the next field, "done" submits. */
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  ref?: Ref<TextInputInstance>;
};

type KindProps = Pick<TextInputProps, 'keyboardType' | 'autoComplete' | 'textContentType' | 'autoCapitalize' | 'autoCorrect'>;

const kinds: Record<TextFieldKind, KindProps> = {
  text: { keyboardType: 'default', autoCapitalize: 'sentences' },
  phone: { keyboardType: 'phone-pad', autoComplete: 'tel', textContentType: 'telephoneNumber', autoCapitalize: 'none', autoCorrect: false },
  givenName: { keyboardType: 'default', autoComplete: 'given-name', textContentType: 'givenName', autoCapitalize: 'words', autoCorrect: false },
  familyName: { keyboardType: 'default', autoComplete: 'family-name', textContentType: 'familyName', autoCapitalize: 'words', autoCorrect: false },
  /** Letters and digits typed as printed (plate, licence number). */
  reference: { keyboardType: 'default', autoComplete: 'off', autoCapitalize: 'characters', autoCorrect: false },
};

/** Champ du PWA (Components/ui/Champ): label, input 56 dp, error under the field. */
export function TextField({
  label,
  value,
  onChangeText,
  kind = 'text',
  error,
  hint,
  placeholder,
  icon,
  autoFocus,
  maxLength,
  returnKeyType = 'done',
  onSubmitEditing,
  ref,
}: TextFieldProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);
  const errorTarget = useFormErrorTarget(hasError);

  return (
    <View ref={errorTarget} style={s.wrapper}>
      <Text style={s.label} importantForAccessibility="no" accessibilityElementsHidden>
        {label}
      </Text>
      <View>
        <TextInput
          ref={ref}
          style={[s.input, icon ? s.inputWithIcon : null, focused && s.inputFocused, hasError && s.inputError]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSubtle}
          selectionColor={theme.colors.accent}
          cursorColor={theme.colors.accent}
          autoFocus={autoFocus}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          submitBehavior={returnKeyType === 'next' ? 'submit' : 'blurAndSubmit'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          {...kinds[kind]}
        />
        {icon ? (
          <View style={s.icon} pointerEvents="none">
            <Icon name={icon} tone={focused ? 'accent' : 'muted'} />
          </View>
        ) : null}
      </View>
      {hasError ? <FieldMessage tone="danger" message={error ?? ''} /> : hint ? <FieldMessage tone="muted" message={hint} /> : null}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii, controlHeight }: Theme) =>
  StyleSheet.create({
    wrapper: { gap: spacing[2] },
    label: { ...typography.bodyStrong, color: colors.text },
    input: {
      ...typography.body,
      minHeight: controlHeight,
      paddingHorizontal: spacing[4],
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    // Room for the 20 dp icon and a gap before the text.
    inputWithIcon: { paddingLeft: spacing[4] + spacing[5] + spacing[2] },
    icon: { position: 'absolute', left: spacing[4], top: 0, bottom: 0, justifyContent: 'center' },
    inputFocused: { borderColor: colors.accent },
    inputError: { borderColor: colors.danger },
  });
