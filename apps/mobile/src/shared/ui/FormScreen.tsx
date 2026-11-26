import { useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import { Keyboard, Platform, ScrollView, StyleSheet, Text, View, type ScrollViewInstance, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/shared/theme';

import { FormErrorContext, type ErrorTarget, type FormErrorRegistry } from './formErrors';
import { smoothScrollTo, stopSmoothScroll } from './smoothScroll';

export type FormScreenProps = {
  title: string;
  /** A line under the title; a node for a styled one (e.g. a trip with an icon), kept close to the title. */
  subtitle?: ReactNode;
  /** The fields. */
  children: ReactNode;
  /** The main button: always visible, above the keyboard. */
  footer: ReactNode;
  /** Screen without a header: adds the status bar space. */
  safeTop?: boolean;
  ref?: Ref<FormScreenHandle>;
};

export type FormScreenHandle = {
  /**
   * Scrolls to the highest field in error if it is hidden (under the keyboard or off screen).
   * Call it right after setting the errors: it waits for them to be drawn.
   */
  revealFirstError: () => void;
};

/** Space kept above the field we scroll to. */
const REVEAL_MARGIN = 24;
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
export function FormScreen({ title, subtitle, children, footer, safeTop = false, ref }: FormScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(theme), [theme]);
  const container = useRef<ViewInstance>(null);
  const overlap = useKeyboardOverlap(container);
  const scroll = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  const targets = useRef(new Set<ErrorTarget>());
  const [revealRequest, setRevealRequest] = useState(0);
  const stopReveal = useRef<(() => void) | null>(null);

  const cancelReveal = (): void => stopSmoothScroll(stopReveal);
  useEffect(() => () => stopSmoothScroll(stopReveal), []);

  const registry = useMemo<FormErrorRegistry>(
    () => ({
      register: (target) => {
        targets.current.add(target);
        return () => {
          targets.current.delete(target);
        };
      },
    }),
    [],
  );

  useImperativeHandle(ref, () => ({ revealFirstError: () => setRevealRequest((n) => n + 1) }), []);

  // Runs after the fields drew their errors (children's effects run before this one).
  useEffect(() => {
    const area = scroll.current;
    if (revealRequest === 0 || !area) return;
    area.measureInWindow((_x, areaTop, _width, areaHeight) => {
      const tops: Promise<{ top: number; height: number }>[] = [...targets.current].map(
        (target) =>
          new Promise((resolve) => {
            if (!target.current) resolve({ top: Number.POSITIVE_INFINITY, height: 0 });
            else target.current.measureInWindow((_tx, top, _tw, height) => resolve({ top, height }));
          }),
      );
      void Promise.all(tops).then((boxes) => {
        const first = boxes.reduce((a, b) => (b.top < a.top ? b : a), { top: Number.POSITIVE_INFINITY, height: 0 });
        if (!Number.isFinite(first.top)) return;
        const hidden = first.top < areaTop || first.top + first.height > areaTop + areaHeight;
        if (!hidden) return;
        const to = Math.max(0, scrollY.current + first.top - areaTop - REVEAL_MARGIN);
        stopSmoothScroll(stopReveal);
        void smoothScrollTo(area, scrollY.current, to).then((stop) => {
          stopReveal.current = stop;
        });
      });
    });
  }, [revealRequest]);

  return (
    <View ref={container} style={[s.screen, { paddingBottom: overlap }]}>
      <ScrollView
        ref={scroll}
        onScroll={(event) => {
          scrollY.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onScrollBeginDrag={cancelReveal}
        style={s.scroll}
        contentContainerStyle={[s.content, safeTop && { paddingTop: insets.top + theme.spacing[6] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.heading}>
          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
          {typeof subtitle === 'string' ? <Text style={s.subtitle}>{subtitle}</Text> : (subtitle ?? null)}
        </View>
        <FormErrorContext value={registry}>{children}</FormErrorContext>
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
