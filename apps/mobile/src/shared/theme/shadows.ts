/**
 * Ombres, reprises du PWA (--shadow-*), avec la propriété `boxShadow` de
 * React Native (New Architecture, RN 0.76+), qui accepte la syntaxe CSS.
 *
 * Définies pour l'instant : card (--shadow-1) et nav (--shadow-nav), à tester
 * sur le téléphone avant d'en ajouter d'autres.
 * En attente : --shadow-2 (élément surélevé) et --shadow-green (bouton principal).
 */

export type ShadowRole = 'card' | 'nav';
export type ThemeShadows = Record<ShadowRole, string>;

export const lightShadows: ThemeShadows = {
  card: '0px 1px 2px rgba(11, 42, 30, 0.04), 0px 3px 10px rgba(11, 42, 30, 0.04)',
  nav: '0px 14px 32px rgba(11, 21, 18, 0.24)',
};

export const darkShadows: ThemeShadows = {
  card: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 3px 10px rgba(0, 0, 0, 0.2)',
  nav: '0px 14px 32px rgba(0, 0, 0, 0.55)',
};
