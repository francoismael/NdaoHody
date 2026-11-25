import type { TextStyle } from 'react-native';

/**
 * Typographie de NdaoHody, reprise du PWA (ndaohody.css : body ligne 99,
 * classes .t-* lignes 139 à 150).
 *
 * Règles React Native (différentes du CSS) :
 *  - une graisse = un fichier de police = un nom de famille. On ne met JAMAIS
 *    `fontWeight` avec Inter : sur Android, une graisse non chargée retombe
 *    sans bruit sur la police système ;
 *  - `letterSpacing` est en pixels (CSS : em × taille) ;
 *  - `lineHeight` est en pixels (CSS : ratio × taille, arrondi).
 *    Les titres du PWA sans line-height héritent du 1,45 du body.
 *
 * Graisses gardées : 400, 500, 600, 700, 800 (toutes celles que le PWA utilise
 * vraiment). Écartées : 100 (1 usage) et 900 (2 usages), remplacées par 800.
 */

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

export type FontWeightName = keyof typeof fontFamilies;

const role = (
  size: number,
  weight: FontWeightName,
  lineHeightRatio: number,
  letterSpacingEm = 0,
): TextStyle => ({
  fontFamily: fontFamilies[weight],
  fontSize: size,
  lineHeight: Math.round(size * lineHeightRatio),
  letterSpacing: Math.round(size * letterSpacingEm * 100) / 100,
});

const BODY_LINE_HEIGHT = 1.45;

/** La liste des rôles : une faute de frappe devient une erreur TypeScript. */
export type TextRole =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'caption'
  | 'label'
  | 'number'
  | 'tab'
  | 'tabActive';

export const typography: Record<TextRole, TextStyle> = {
  /** .t-display : grand titre d'accueil */
  display: role(30, 'extraBold', 1.08, -0.035),
  /** .t-h1 : titre d'écran */
  title: role(26, 'extraBold', BODY_LINE_HEIGHT, -0.03),
  /** .t-h2 : titre de section */
  heading: role(20, 'bold', BODY_LINE_HEIGHT),
  /** .t-h3 : sous-titre, titre de carte */
  subheading: role(16, 'bold', BODY_LINE_HEIGHT, -0.01),
  /** body : texte courant */
  body: role(15, 'regular', BODY_LINE_HEIGHT),
  /** body + .t-strong : texte courant appuyé */
  bodyStrong: role(15, 'semiBold', BODY_LINE_HEIGHT),
  /** .t-small : texte secondaire */
  small: role(13, 'regular', BODY_LINE_HEIGHT),
  /** .t-xs : légende */
  caption: role(12, 'regular', BODY_LINE_HEIGHT),
  /** étiquette en capitales (ligne 1022) */
  label: { ...role(12, 'semiBold', BODY_LINE_HEIGHT, 0.03), textTransform: 'uppercase' },
  /** .t-num : prix, chiffres mis en avant (taille de .t-h2) */
  number: {
    ...role(20, 'extraBold', BODY_LINE_HEIGHT, -0.03),
    fontVariant: ['tabular-nums'],
  },
  /** .bn__item : libellé d'onglet (accueil.css, 500 12px) */
  tab: role(12, 'medium', BODY_LINE_HEIGHT),
  /** .bn__item.is-actif : onglet actif (700) */
  tabActive: role(12, 'bold', BODY_LINE_HEIGHT),
};
