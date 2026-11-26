import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type ColorRole, type Theme } from '@/shared/theme';

import { Icon, type IconName, type IconTone } from './Icon';

/**
 * Variantes du jour (PWA .btn--*). Les autres (dark, soft, danger, brand)
 * naîtront quand un écran en aura besoin.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = {
  /** Texte du bouton, aussi lu par le lecteur d'écran. */
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Icône Tabler avant le texte. */
  icon?: IconName;
  disabled?: boolean;
  /** Indicateur + bouton inactif : évite le double envoi. */
  loading?: boolean;
  /** Pleine largeur (par défaut, comme dans le PWA) ou largeur du contenu. */
  width?: 'full' | 'auto';
  /** Précise l'effet si le libellé ne suffit pas (« Envoie un SMS au numéro saisi »). */
  hint?: string;
};

type VariantRoles = {
  background: ColorRole | 'transparent';
  pressed: ColorRole;
  border: ColorRole | 'transparent';
  pressedBorder: ColorRole | 'transparent';
  text: ColorRole;
  icon: IconTone;
};

/** Correspondance PWA → rôles. Au tactile, l'état « pressé » reprend le :hover/:active du PWA. */
const variants: Record<ButtonVariant, VariantRoles> = {
  primary: {
    background: 'primary',
    pressed: 'primaryPressed',
    border: 'transparent',
    pressedBorder: 'transparent',
    text: 'onPrimary',
    icon: 'onPrimary',
  },
  secondary: {
    background: 'surface',
    pressed: 'surfaceRaised',
    border: 'border',
    pressedBorder: 'borderStrong',
    text: 'text',
    icon: 'default',
  },
  ghost: {
    background: 'transparent',
    pressed: 'fill',
    border: 'transparent',
    pressedBorder: 'transparent',
    text: 'text',
    icon: 'default',
  },
  /** Ajout (26/11) : confirmer une action qui détruit (« Oui, supprimer »). */
  danger: {
    background: 'danger',
    pressed: 'dangerPressed',
    border: 'transparent',
    pressedBorder: 'transparent',
    text: 'onDanger',
    icon: 'onDanger',
  },
};

/** Durée minimale de l'indicateur (PWA : 400 ms), pour éviter un clignotement. */
const MIN_LOADING_MS = 400;

/** Vrai pendant le chargement, prolongé jusqu'à 400 ms s'il a été plus court. Rien n'est retardé. */
function useMinLoading(loading: boolean, minimum = MIN_LOADING_MS): boolean {
  const [visible, setVisible] = useState(loading);
  const start = useRef(loading ? Date.now() : 0);

  useEffect(() => {
    if (loading) {
      start.current = Date.now();
      setVisible(true);
      return undefined;
    }
    const rest = minimum - (Date.now() - start.current);
    if (rest <= 0) {
      setVisible(false);
      return undefined;
    }
    const t = setTimeout(() => setVisible(false), rest);
    return () => clearTimeout(t);
  }, [loading, minimum]);

  return loading || visible;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  width = 'full',
  hint,
}: ButtonProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const busy = useMinLoading(loading);
  const inactive = disabled || busy;
  const roles = variants[variant];
  const color = (role: ColorRole | 'transparent') =>
    role === 'transparent' ? 'transparent' : theme.colors[role];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      // TalkBack n'annonce pas toujours « busy » : on le dit aussi dans le libellé.
      accessibilityLabel={busy ? `${label}, en cours` : label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        s.base,
        width === 'full' ? s.full : s.auto,
        {
          backgroundColor: color(pressed ? roles.pressed : roles.background),
          borderColor: color(pressed ? roles.pressedBorder : roles.border),
        },
        pressed && s.pressed,
        disabled && s.disabled,
      ]}
    >
      <View style={s.content}>
        {busy ? (
          <ActivityIndicator size="small" color={theme.colors[roles.text]} />
        ) : (
          icon && <Icon name={icon} tone={roles.icon} />
        )}
        <Text style={[s.text, { color: theme.colors[roles.text] }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

// 22 et 10 : valeurs exactes de .btn dans le PWA (hors échelle d'espacement).
const createStyles = ({ typography, radii, controlHeight }: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: controlHeight,
      paddingHorizontal: 22,
      borderRadius: radii.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    full: { alignSelf: 'stretch' },
    auto: { alignSelf: 'flex-start' },
    content: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    /** .btn : Inter 700, 16 px, -0,01 em → rôle subheading. */
    text: { ...typography.subheading, textAlign: 'center', flexShrink: 1 },
    /** .btn:active { transform: scale(.98) } */
    pressed: { transform: [{ scale: 0.98 }] },
    /** .btn:disabled { opacity: .45 } */
    disabled: { opacity: 0.45 },
  });
