import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';
import { Button, PromptCard } from '@/shared/ui';

import type { LocationIssue, LocationStep } from '../hooks/useLocationIssue';

type LocationPromptProps = {
  issue: LocationIssue;
  /** More actions under the steps (e.g. "Rechercher un trajet"). */
  children?: ReactNode;
  /** The short note and the buttons, all secondary: no icon nor title (driver home). */
  plain?: boolean;
  /** With `plain`: the shortest note (little map left above a tall panel). */
  short?: boolean;
};

/**
 * The position is off: in the middle of the map, why it matters and a button per step still
 * to do (permission, then GPS). No card of its own: it sits on the LocationVeil.
 */
export function LocationPrompt({ issue, children, plain = false, short = false }: LocationPromptProps) {
  // The step whose action is running (refused GPS box: the spinner stops, the button stays).
  const [running, setRunning] = useState<string | null>(null);
  const press = async (step: LocationStep) => {
    if (step.waits) setRunning(step.label);
    try {
      await step.onPress();
    } finally {
      setRunning(null);
    }
  };
  return (
    <PromptCard title={plain ? undefined : issue.title} text={plain ? (short ? issue.shortNote : issue.note) : issue.text} bare>
      {/* One main action: the first step left; the other one, if any, in secondary (plain: all secondary). */}
      {issue.steps.map((step, index) => (
        <Button
          key={step.label}
          label={step.label}
          icon={step.icon}
          variant={index === 0 && !plain ? 'primary' : 'secondary'}
          loading={running === step.label}
          onPress={() => void press(step)}
        />
      ))}
      {children}
    </PromptCard>
  );
}

/** The map stays faintly visible under the veil; a little more covered on the passenger home (title and longer text). */
const VEIL_OPACITY = { driver: 0.75, passenger: 0.98 } as const;

/** While the position is off: a veil over the whole map, the prompt on top. Touches go through. */
export function LocationVeil({ home }: { home: keyof typeof VEIL_OPACITY }) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  return <View style={[s.veil, { opacity: VEIL_OPACITY[home] }]} pointerEvents="none" />;
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    veil: { ...StyleSheet.absoluteFill, backgroundColor: colors.surface },
  });
