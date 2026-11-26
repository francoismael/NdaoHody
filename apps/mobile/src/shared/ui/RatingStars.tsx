import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme, type Theme } from '@/shared/theme';

import { iconPaths } from './icons';

const STAR_COUNT = 5;
const STAR_PX = 16;

export type RatingStarsProps = {
  /** Note from 0 to 5, decimals included: 4,5 = four full stars and a half one. */
  value: number;
  /** Spoken label; without one the stars are decorative (the text around says the note). */
  label?: string;
};

function Star({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <Svg width={STAR_PX} height={STAR_PX} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {iconPaths.star.map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  );
}

/**
 * "★★★★⯪": each star is filled by its share of the note (a hollow star, with the full star
 * on top cut to that width), hollow ones outlined like the PWA .stars.
 */
export function RatingStars({ value, label }: RatingStarsProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const on = theme.colors.ratingStar;
  const off = theme.colors.borderStrong;
  const note = Math.max(0, Math.min(STAR_COUNT, value));
  const decorative = label === undefined;

  return (
    <View
      style={s.row}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={label}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    >
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        const share = Math.max(0, Math.min(1, note - i));
        return (
          <View key={i} style={s.star}>
            <Star fill="none" stroke={off} />
            {share > 0 ? (
              <View style={[s.full, { width: STAR_PX * share }]}>
                <Star fill={on} stroke={on} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = ({ spacing }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: spacing[1] / 2 },
    star: { width: STAR_PX, height: STAR_PX },
    full: { position: 'absolute', top: 0, left: 0, height: STAR_PX, overflow: 'hidden' },
  });
