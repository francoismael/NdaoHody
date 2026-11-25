import { useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import { AccessibilityInfo, Keyboard, Platform, ScrollView, StyleSheet, Text, View, type ScrollViewInstance, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/shared/theme';

import { FormErrorContext, type ErrorTarget, type FormErrorRegistry } from './formErrors';

export type FormScreenProps = {
  title: string;
  subtitle?: string;
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
/** Slower than the native smooth scroll (~250 ms), so the eye can follow. */
const REVEAL_DURATION_MS = 450;

/** Starts slowly, speeds up, slows down at the end (cubic ease-in-out). */
const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Scrolls `area` from `from` to `to` with an ease-in-out, frame by frame (the native
 * `scrollTo({ animated: true })` has a fixed speed and no easing). Returns how to stop it.
 */
function animateScroll(area: ScrollViewInstance, from: number, to: number): () => void {
  let frame = 0;
  const start = Date.now();
  const step = (): void => {
    const progress = Math.min(1, (Date.now() - start) / REVEAL_DURATION_MS);
    area.scrollTo({ y: from + (to - from) * easeInOutCubic(progress), animated: false });
    if (progress < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}

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

/** Stops the scroll animation kept in `stop`, if any. */
function stopAnimation(stop: RefObject<(() => void) | null>): void {
  stop.current?.();
  stop.current = null;
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

  const cancelReveal = (): void => stopAnimation(stopReveal);
  useEffect(() => () => stopAnimation(stopReveal), []);

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
        void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
          stopAnimation(stopReveal);
          // Reduced motion (Android setting "Remove animations"): jump, no movement.
          if (reduced) area.scrollTo({ y: to, animated: false });
          else stopReveal.current = animateScroll(area, scrollY.current, to);
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
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
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
