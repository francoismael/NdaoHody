import { MarkerView } from '@rnmapbox/maps';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';

import type { LngLat } from './geo';
import { MovingMarker } from './MovingMarker';

type PlaceLabelProps = {
  /** Unique on the map: the dot's layer is `${id}-circle` (a route can go below it). */
  id: string;
  coordinate: LngLat;
  /** What the place is: "Départ", "Arrivée", "Toi"… */
  label: string;
  /** Ring of the dot: accent (default) or onward (the end of a route after the user). */
  tone?: 'accent' | 'onward';
};

/**
 * A fixed place on AppMap: a small dot on the exact point, and a bubble above it
 * saying what it is. Knows nothing about carpooling.
 */
export function PlaceLabel({ id, coordinate, label, tone = 'accent' }: PlaceLabelProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  return (
    <>
      <MovingMarker id={id} coordinate={coordinate} kind="place" tone={tone} />
      {/* Anchored by its bottom (the tail's tip) just above the dot. */}
      <MarkerView coordinate={coordinate} anchor={{ x: 0.5, y: 1 }} allowOverlap allowOverlapWithPuck>
        <View style={s.wrapper} pointerEvents="none" accessible accessibilityLabel={label}>
          <View style={s.bubble}>
            <Text style={s.text} numberOfLines={1}>
              {label}
            </Text>
          </View>
          <View style={s.tail} />
        </View>
      </MarkerView>
    </>
  );
}

const createStyles = ({ colors, typography, fontFamilies, spacing, radii, shadows }: Theme) =>
  StyleSheet.create({
    // The bottom space keeps the dot (radius 5 + ring 2) visible under the tail.
    wrapper: { alignItems: 'center', paddingBottom: spacing[2] },
    bubble: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: radii.full,
      backgroundColor: colors.inverseSurface,
      boxShadow: shadows.card,
    },
    text: { ...typography.caption, fontFamily: fontFamilies.semiBold, color: colors.onInverse },
    tail: {
      width: 0,
      height: 0,
      borderLeftWidth: 5,
      borderRightWidth: 5,
      borderTopWidth: 6,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: colors.inverseSurface,
    },
  });
