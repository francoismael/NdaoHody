import type { ReactNode } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/shared/theme';

/** Icônes de la barre du bas, copiées de BarreNavigation (PWA). */
export type TabIconName = 'home' | 'trips' | 'publish' | 'messages' | 'profile';

export type TabIconProps = {
  name: TabIconName;
  /** Onglet actif : icône pleine, sinon au trait. */
  focused: boolean;
};

/** Toujours décorative : le libellé de l'onglet porte le sens. */
export function TabIcon({ name, focused }: TabIconProps) {
  const { colors } = useTheme();
  const color = focused ? colors.navActive : colors.textMuted;
  const line = { fill: 'none', stroke: color, strokeWidth: 1.6 } as const;

  const shapes: Record<TabIconName, { filled: ReactNode; outline: ReactNode }> = {
    home: {
      filled: (
        <Path
          d="M12 2.6 2.4 10.6a1 1 0 0 0 .6 1.8H4V20a1.5 1.5 0 0 0 1.5 1.5h4v-6h5v6h4A1.5 1.5 0 0 0 20 20v-7.6h1a1 1 0 0 0 .6-1.8z"
          fill={color}
        />
      ),
      outline: (
        <Path
          d="M3.5 10.8 12 3.5l8.5 7.3V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"
          {...line}
          strokeLinejoin="round"
        />
      ),
    },
    trips: {
      filled: (
        <G fill={color}>
          <Path d="M6.6 6.8A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 10.5H5z" opacity={0.6} />
          <Path
            d="M5 10.5h14a2 2 0 0 1 2 2V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3.5a2 2 0 0 1 2-2zm2.5 2.3a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm9 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"
            fillRule="evenodd"
          />
          <Rect x={4.5} y={16} width={3} height={3.5} rx={1} />
          <Rect x={16.5} y={16} width={3} height={3.5} rx={1} />
        </G>
      ),
      outline: (
        <G {...line} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M5 10.5l1.6-3.7A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3l1.6 3.7" />
          <Rect x={3} y={10.5} width={18} height={6.5} rx={2} />
          <Path d="M6 17v2.5M18 17v2.5" />
          <Circle cx={7.5} cy={13.8} r={1} />
          <Circle cx={16.5} cy={13.8} r={1} />
        </G>
      ),
    },
    messages: {
      filled: (
        <Path
          d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.5z"
          fill={color}
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      ),
      outline: (
        <Path
          d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.5z"
          {...line}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      ),
    },
    publish: {
      filled: (
        <G>
          <Circle cx={12} cy={12} r={9.5} fill={color} />
          <Path
            d="M12 7.5v9M7.5 12h9"
            fill="none"
            stroke={colors.navSurface}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </G>
      ),
      outline: (
        <G {...line} strokeLinecap="round">
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 7.5v9M7.5 12h9" />
        </G>
      ),
    },
    profile: {
      filled: (
        <G fill={color}>
          <Circle cx={12} cy={7.5} r={4.5} />
          <Path d="M3.5 20.5a8.5 8.5 0 0 1 17 0 1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" />
        </G>
      ),
      outline: (
        <G {...line} strokeLinecap="round">
          <Circle cx={12} cy={7.5} r={4} />
          <Path d="M4 21a8 8 0 0 1 16 0" />
        </G>
      ),
    },
  };

  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {focused ? shapes[name].filled : shapes[name].outline}
    </Svg>
  );
}
