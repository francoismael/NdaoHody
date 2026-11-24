import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { useTheme, type Theme } from '@/shared/theme';

/** .bn : 64 px de haut, plus la zone de geste du système. */
const BAR_HEIGHT = 64;

/**
 * Barre d'onglets du bas, reprise de BarreNavigation (PWA) : pleine largeur,
 * trait en haut, icône + libellé, onglet actif en vert et en gras.
 * L'icône vient de l'option `tabBarIcon` de chaque onglet ; un onglet
 * `hidden` (autre rôle) n'est pas dessiné.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const focusedKey = state.routes[state.index]?.key;

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}
    >
      {state.routes.map((route) => {
        const { options } = descriptors[route.key];
        if (options.hidden) return null;

        const focused = route.key === focusedKey;
        const label = options.title ?? route.name;

        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        const onLongPress = () => {
          emitter.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          >
            {options.tabBarIcon?.({
              focused,
              color: focused ? theme.colors.navActive : theme.colors.textMuted,
              size: 24,
            })}
            <Text style={focused ? styles.labelActive : styles.label} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing }: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingHorizontal: spacing[2],
      borderTopWidth: 1,
      borderTopColor: colors.navBorder,
      backgroundColor: colors.navSurface,
    },
    item: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[1],
    },
    itemPressed: { transform: [{ scale: 0.94 }] },
    label: { ...typography.tab, color: colors.textMuted },
    labelActive: { ...typography.tabActive, color: colors.navActive },
  });
