import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';

type RideSheetProps = {
  children: ReactNode;
  /** Its height, so the map keeps the road above it. */
  onHeight: (height: number) => void;
};

/** The bottom sheet of the ride screens (passenger and driver): attached to the edges, like the homes' panel. */
export function RideSheet({ children, onHeight }: RideSheetProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={s.sheet} onLayout={(event) => onHeight(event.nativeEvent.layout.height)}>
      {children}
    </View>
  );
}

const createStyles = ({ colors, spacing, gutter, radii, shadows }: Theme) =>
  StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      gap: spacing[4],
      paddingHorizontal: gutter,
      paddingTop: spacing[4],
      paddingBottom: spacing[6],
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      borderTopWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      boxShadow: shadows.card,
    },
  });
