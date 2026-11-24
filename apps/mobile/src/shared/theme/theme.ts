import { useColorScheme, type TextStyle } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './colors';
import { darkShadows, lightShadows, type ThemeShadows } from './shadows';
import { controlHeight, gutter, radii, spacing } from './tokens';
import { fontFamilies, typography, type TextRole } from './typography';

export type ColorSchemeName = 'light' | 'dark';

export type Theme = {
  scheme: ColorSchemeName;
  colors: ThemeColors;
  shadows: ThemeShadows;
  typography: Record<TextRole, TextStyle>;
  fontFamilies: typeof fontFamilies;
  spacing: typeof spacing;
  gutter: number;
  radii: typeof radii;
  controlHeight: number;
};

const shared = { typography, fontFamilies, spacing, gutter, radii, controlHeight };

/** Deux objets créés une seule fois : basculer de mode ne recrée rien. */
export const themes: Record<ColorSchemeName, Theme> = {
  light: { scheme: 'light', colors: lightColors, shadows: lightShadows, ...shared },
  dark: { scheme: 'dark', colors: darkColors, shadows: darkShadows, ...shared },
};

/**
 * Le thème qui suit le réglage du téléphone, en direct.
 * Tout ce qui n'est pas « dark » (y compris inconnu) donne le clair.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? themes.dark : themes.light;
}
