/**
 * Espacements, rayons et hauteur des contrôles, repris du PWA
 * (ndaohody.css, :root). Ils ne changent pas entre clair et sombre.
 */

/** --s-* : échelle de 4 en 4. `8` n'est pas utilisé dans le PWA, gardé pour la continuité. */
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

/** --gutter : marge gauche/droite des écrans. */
export const gutter = 20;

/** --r-* */
export const radii = {
  sm: 12,
  md: 18,
  lg: 20,
  xl: 24,
  full: 999,
} as const;

/** --h-control : hauteur des boutons et des champs (au-dessus des 48 dp minimum d'Android). */
export const controlHeight = 56;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radii;
