import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Keyboard, Platform, ScrollView, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/shared/theme';

export type FormScreenProps = {
  title: string;
  subtitle?: string;
  /** The fields. */
  children: ReactNode;
  /** The main button: always visible, above the keyboard. */
  footer: ReactNode;
  /** Screen without a header: adds the status bar space. */
  safeTop?: boolean;
};

/**
 * How much of this view the keyboard covers. Measured in window coordinates,
 * so it is right with or without a header and whether Android resizes the window
 * (adjustResize) or not (edge-to-edge): in the first case the overlap is simply 0.
 */
function useKeyboardOverlap(view: RefObject<ViewInstance | null>): number {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      view.current?.measureInWindow((_x, y, _width, height) => {
        setOverlap(Math.max(0, y + height - event.endCoordinates.screenY));
      });
    });
    const hide = Keyboard.addListener(hideEvent, () => setOverlap(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [view]);

  return overlap;
}

/** Form layout (sign-in, later vehicle, publish): title, fields, main button kept above the keyboard. */
export function FormScreen({ title, subtitle, children, footer, safeTop = false }: FormScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(theme), [theme]);
  const container = useRef<ViewInstance>(null);
  const overlap = useKeyboardOverlap(container);

  return (
    <View ref={container} style={[s.screen, { paddingBottom: overlap }]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, safeTop && { paddingTop: insets.top + theme.spacing[6] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.heading}>
          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
      <View style={[s.footer, { paddingBottom: overlap > 0 ? theme.spacing[3] : Math.max(insets.bottom, theme.spacing[4]) }]}>
        {footer}
      </View>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, gutter }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { padding: gutter, paddingTop: spacing[6], gap: spacing[5] },
    heading: { gap: spacing[2] },
    title: { ...typography.title, color: colors.text },
    subtitle: { ...typography.body, color: colors.textMuted },
    footer: { paddingHorizontal: gutter, paddingTop: spacing[3], gap: spacing[2], backgroundColor: colors.background },
  });
