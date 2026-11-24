import Svg, { Path } from 'react-native-svg';

import { useTheme, type ColorRole } from '@/shared/theme';

import { iconPaths, type IconName } from './icons';

/** Tailles d'intention, pas de pixels libres. */
export type IconSize = 'sm' | 'md' | 'lg';

/** Tons autorisés : chacun pointe vers un rôle du thème. */
export type IconTone = 'default' | 'soft' | 'muted' | 'accent' | 'danger' | 'onPrimary';

const sizes: Record<IconSize, number> = { sm: 16, md: 20, lg: 24 };

const toneRoles: Record<IconTone, ColorRole> = {
  default: 'text',
  soft: 'textSoft',
  muted: 'textMuted',
  accent: 'accent',
  danger: 'danger',
  onPrimary: 'onPrimary',
};

export type IconProps = {
  name: IconName;
  size?: IconSize;
  tone?: IconTone;
  /**
   * Libellé lu par le lecteur d'écran. Sans libellé, l'icône est décorative
   * et cachée (le texte voisin porte déjà le sens).
   */
  label?: string;
};

/** Icône Tabler (trait 2, 24×24), comme dans le PWA. Ne se presse pas. */
export function Icon({ name, size = 'md', tone = 'default', label }: IconProps) {
  const { colors } = useTheme();
  const px = sizes[size];
  const decorative = label === undefined;

  return (
    <Svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors[toneRoles[tone]]}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={label}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    >
      {iconPaths[name].map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </Svg>
  );
}

export type { IconName };
