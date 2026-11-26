/**
 * Couleurs de NdaoHody, reprises du PWA (resources/css/ndaohody.css).
 *
 * Deux couches :
 *  - `palette` : les valeurs brutes. PRIVÉE à ce fichier, jamais exportée.
 *  - `lightColors` / `darkColors` : les rôles. Seuls les rôles sortent du thème.
 *
 * Les contrastes viennent du PWA et ne doivent pas être « améliorés » à l'œil :
 *  - accent (#06764F) : 5,2:1 sur background (#F4F7F5) ;
 *  - textSubtle (#617066) : 5:1 sur blanc.
 *
 * Variables du PWA volontairement écartées (7) :
 *  - --c-green-hover, --c-primary-hover, --c-brand-hover, --c-hover :
 *    le survol n'existe pas sur un écran tactile ;
 *  - --c-green-press, --c-night-2, --c-splash : jamais utilisées dans le PWA
 *    (la valeur de --c-splash est celle de brand, à reprendre au prochain rebuild).
 *
 * Ajout : onPrimary (texte sur un bouton principal), écrit en dur dans le PWA.
 * Ajout (R1) : navSurface, navBorder, navActive, repris des jetons --ax-* de
 * accueil.css (barre du bas, BarreNavigation).
 */

const palette = {
  white: '#FFFFFF',

  green900: '#0B4D35',
  green800: '#06764F',
  green700: '#07845C',
  green600: '#055E42',
  green750: '#06704E',
  green50: '#E7F3EC',
  green100: '#D0E9DB',
  green200: '#A9D7BE',
  mint: '#A8F0B8',
  mintBright: '#5BD6A0',
  mintSoft: '#8BE3B8',
  greenDark50: '#13281F',
  greenDark100: '#183526',
  greenDark200: '#24553F',

  ink900: '#0B2A1E',
  ink800: '#1E3B2F',
  slate600: '#5B6B62',
  slate550: '#617066',
  slate400: '#8A988F',
  gray100: '#E1E8E4',
  gray200: '#CBD6D0',
  gray50: '#EEF3F0',
  mist: '#F4F7F5',
  skelA: '#E7EDE9',
  skelB: '#F2F6F3',
  mapLight: '#E8EDEB',
  blue50: '#EEF4FF',

  night: '#0A0F0D',
  nightMuted: '#8FA39A',
  dark950: '#0B1512',
  dark900: '#0E1512',
  dark850: '#16201B',
  dark800: '#1E2A24',
  dark750: '#1C2823',
  dark700: '#24312B',
  dark650: '#1B2722',
  dark600: '#26332D',
  dark500: '#34443C',
  dark400: '#6E8178',
  light100: '#E8F0EC',
  light200: '#CFDBD5',
  light300: '#A3B5AC',
  light400: '#93A69C',
  blueDark: '#16243A',
  navDark: '#121A16',

  red600: '#B83A29',
  red50: '#FBECE9',
  red100: '#F7DDD8',
  red200: '#F2D2CC',
  red700: '#9A2F21', // ajout (26/11) : bouton « danger » pressé, thème clair
  redBright: '#FF8A7A',
  redBrightPressed: '#F07462', // ajout (26/11) : bouton « danger » pressé, thème sombre
  redDark50: '#3A1D19',
  redDark100: '#4A231E',
  redDark200: '#5A2A23',
  amber700: '#8F5D0E',
  amber50: '#FBF1DE',
  amberBright: '#F2BE6B',
  amberDark50: '#33280F',
  gold: '#E0A526', // ajout (bloc 6) : étoiles du PWA (.stars), thème clair
  goldBright: '#F2C14E', // étoiles du PWA, thème sombre
} as const;

export const lightColors = {
  // Texte
  text: palette.ink900,
  textSoft: palette.ink800,
  textMuted: palette.slate600,
  textSubtle: palette.slate550,
  iconDecorative: palette.slate400,

  // Accent (texte, icônes, liens)
  accent: palette.green800,
  accentStrong: palette.green900,
  accentSurface: palette.green50,
  accentSurfaceStrong: palette.green100,
  accentBorder: palette.green200,

  // Action principale
  primary: palette.green700,
  primaryPressed: palette.green600,
  onPrimary: palette.white,

  // Marque
  brand: palette.green900,
  accentOnBrand: palette.mint,

  // Surfaces
  background: palette.mist,
  surface: palette.white,
  surfaceBorder: 'rgba(11, 42, 30, 0.04)',
  surfaceRaised: palette.white,
  fill: palette.gray50,

  // Bordures
  border: palette.gray100,
  borderStrong: palette.gray200,

  // États
  danger: palette.red600,
  // Ajout (26/11) : bouton « danger » (confirmer une suppression), plein, texte contrasté.
  dangerPressed: palette.red700,
  onDanger: palette.white,
  dangerSurface: palette.red50,
  dangerSurfaceStrong: palette.red100,
  dangerBorder: palette.red200,
  warning: palette.amber700,
  warningSurface: palette.amber50,

  // Toujours sombre (navigation, carte sombre)
  surfaceFixedDark: palette.night,
  textOnFixedDark: palette.white, // ajout (bloc 2) : texte sur l'écran caméra
  textOnFixedDarkMuted: palette.nightMuted,

  // Élément choisi « inversé » (puce, segment)
  inverseSurface: palette.ink900,
  onInverse: palette.white,

  // Calques et chargement
  overlay: 'rgba(6, 20, 14, 0.45)',
  veil: 'rgba(244, 247, 245, 0.8)',
  skeleton: palette.skelA,
  skeletonHighlight: palette.skelB,
  mapPlaceholder: palette.mapLight,
  // Ajout (bloc 5) : la suite d'un trajet sur la carte, après le passager. Même ambre vif
  // en clair et en sombre : un trait sur la carte, jamais du texte (pas de contraste texte à tenir).
  mapRouteOnward: palette.amberBright,
  // Ajout (bloc 6) : étoile pleine d'une note (PWA .stars). Une étoile vide prend borderStrong.
  ratingStar: palette.gold,

  // Information (ex. élément non lu)
  infoSurface: palette.blue50,

  // Barre d'onglets du bas (accueil.css : --ax-nav-bg, --ax-line, --ax-accent-tx)
  navSurface: palette.white,
  navBorder: 'rgba(10, 15, 13, 0.08)',
  navActive: palette.green900,
} as const;

/** La liste des rôles : une faute de frappe devient une erreur TypeScript. */
export type ColorRole = keyof typeof lightColors;
export type ThemeColors = Record<ColorRole, string>;

export const darkColors: ThemeColors = {
  text: palette.light100,
  textSoft: palette.light200,
  textMuted: palette.light300,
  textSubtle: palette.light400,
  iconDecorative: palette.dark400,

  accent: palette.mintBright,
  accentStrong: palette.mintSoft,
  accentSurface: palette.greenDark50,
  accentSurfaceStrong: palette.greenDark100,
  accentBorder: palette.greenDark200,

  primary: palette.green700,
  primaryPressed: palette.green750,
  onPrimary: palette.white,

  brand: palette.green700,
  accentOnBrand: palette.mint, // non redéfini dans le sombre du PWA

  background: palette.dark900,
  surface: palette.dark850,
  surfaceBorder: 'rgba(255, 255, 255, 0.05)',
  surfaceRaised: palette.dark800,
  fill: palette.dark750,

  border: palette.dark600,
  borderStrong: palette.dark500,

  danger: palette.redBright,
  dangerPressed: palette.redBrightPressed,
  onDanger: palette.night, // rouge clair en sombre : texte foncé pour rester lisible
  dangerSurface: palette.redDark50,
  dangerSurfaceStrong: palette.redDark100,
  dangerBorder: palette.redDark200,
  warning: palette.amberBright,
  warningSurface: palette.amberDark50,

  surfaceFixedDark: palette.dark650,
  textOnFixedDark: palette.white,
  textOnFixedDarkMuted: palette.nightMuted, // non redéfini dans le sombre du PWA

  inverseSurface: palette.light100,
  onInverse: palette.dark950,

  overlay: 'rgba(0, 0, 0, 0.6)',
  veil: 'rgba(14, 21, 18, 0.84)',
  skeleton: palette.dark750,
  skeletonHighlight: palette.dark700,
  mapPlaceholder: palette.dark750,
  mapRouteOnward: palette.amberBright,
  ratingStar: palette.goldBright,

  infoSurface: palette.blueDark,

  navSurface: palette.navDark,
  navBorder: 'rgba(255, 255, 255, 0.06)',
  navActive: palette.mintBright,
};
