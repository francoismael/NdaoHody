import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';
import { ErrorAnchor, FieldMessage } from '@/shared/ui';
import { formatClockMinutes, formatDayTime } from '@/shared/utils';

import { PLAN_DAYS_SHOWN, PLAN_STEP_MINUTES, PLAN_SUGGESTED_MINUTES } from '../rules';

const MINUTE_MS = 60_000;
const LAST_MINUTE_OF_DAY = 24 * 60 - PLAN_STEP_MINUTES;

const startOfDay = (ms: number): Date => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const minutesOfDay = (ms: number): number => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};

const at = (day: Date, minutes: number): number => day.getTime() + minutes * MINUTE_MS;

/** The first quarter of an hour at least `leadMinutes` after `nowMs` (default departure). */
export function nextQuarter(nowMs: number, leadMinutes = 30): number {
  const step = PLAN_STEP_MINUTES * MINUTE_MS;
  return Math.ceil((nowMs + leadMinutes * MINUTE_MS) / step) * step;
}

export type DepartureTimePickerProps = {
  /** Chosen departure (ms, app clock). */
  value: number;
  onChange: (value: number) => void;
  /** Now on the DEMO clock: past days and hours are not offered. */
  now: number;
  error?: string | null;
};

/**
 * Day pills + hour (PWA EtapeQuand / PilulesDates, without native picker: no rebuild).
 * Hours move by 15 min; suggested hours already past today are disabled.
 */
export function DepartureTimePicker({ value, onChange, now, error }: DepartureTimePickerProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);

  const today = startOfDay(now);
  const days = Array.from({ length: PLAN_DAYS_SHOWN }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
  const chosenDay = startOfDay(value).getTime();
  const minutes = minutesOfDay(value);
  const isPast = (dayMs: Date, m: number): boolean => at(dayMs, m) <= now;
  const day = startOfDay(value);

  const pickDay = (d: Date): void => {
    const candidate = at(d, minutes);
    onChange(candidate <= now ? nextQuarter(now) : candidate);
  };
  const shift = (delta: number): void => onChange(at(day, Math.min(LAST_MINUTE_OF_DAY, Math.max(0, minutes + delta))));
  const earlierDisabled = minutes - PLAN_STEP_MINUTES < 0 || isPast(day, minutes - PLAN_STEP_MINUTES);
  const laterDisabled = minutes + PLAN_STEP_MINUTES > LAST_MINUTE_OF_DAY;

  return (
    <ErrorAnchor hasError={Boolean(error)} style={s.wrapper}>
      <Text style={s.label}>Jour</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.days} accessibilityRole="radiogroup">
        {days.map((d, i) => {
          const selected = d.getTime() === chosenDay;
          const top = i === 0 ? 'Auj.' : i === 1 ? 'Demain' : d.toLocaleDateString('fr-FR', { weekday: 'short' });
          return (
            <Pressable
              key={d.getTime()}
              onPress={() => pickDay(d)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              style={({ pressed }) => [s.day, selected && s.selected, pressed && !selected && s.pressed]}
            >
              <Text style={[s.dayTop, selected && s.textSelected]}>{top}</Text>
              <Text style={[s.dayNumber, selected && s.textSelected]}>{d.getDate()}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={s.label}>Heure de départ</Text>
      <View style={s.clock} accessible accessibilityRole="adjustable" accessibilityLabel="Heure de départ" accessibilityValue={{ text: formatClockMinutes(minutes) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment' && !laterDisabled) shift(PLAN_STEP_MINUTES);
          if (event.nativeEvent.actionName === 'decrement' && !earlierDisabled) shift(-PLAN_STEP_MINUTES);
        }}
      >
        <StepButton s={s} label="15 minutes plus tôt" sign="minus" disabled={earlierDisabled} onPress={() => shift(-PLAN_STEP_MINUTES)} />
        <Text style={s.time}>{formatClockMinutes(minutes)}</Text>
        <StepButton s={s} label="15 minutes plus tard" sign="plus" disabled={laterDisabled} onPress={() => shift(PLAN_STEP_MINUTES)} />
      </View>
      <View style={s.hours}>
        {PLAN_SUGGESTED_MINUTES.map((m) => {
          const selected = m === minutes;
          const disabled = isPast(day, m);
          return (
            <Pressable
              key={m}
              onPress={() => onChange(at(day, m))}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              style={({ pressed }) => [s.hour, selected && s.selected, pressed && !selected && s.pressed, disabled && s.disabled]}
            >
              <Text style={[s.hourText, selected && s.textSelected]}>{formatClockMinutes(m)}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <FieldMessage tone="danger" message={error} />
      ) : (
        <Text style={s.recap} accessibilityLiveRegion="polite">
          Départ {formatDayTime(new Date(value), new Date(now))}
        </Text>
      )}
    </ErrorAnchor>
  );
}

type StepButtonProps = { s: ReturnType<typeof createStyles>; label: string; sign: 'minus' | 'plus'; disabled: boolean; onPress: () => void };

function StepButton({ s, label, sign, disabled, onPress }: StepButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={({ pressed }) => [s.step, pressed && s.pressed, disabled && s.disabled]}
    >
      <Text style={s.sign}>{sign === 'minus' ? '−' : '+'}</Text>
    </Pressable>
  );
}

const createStyles = ({ colors, typography, fontFamilies, spacing, radii, controlHeight }: Theme) =>
  StyleSheet.create({
    wrapper: { gap: spacing[3] },
    label: { ...typography.bodyStrong, color: colors.text },
    days: { gap: spacing[2], paddingRight: spacing[2] },
    day: {
      width: 64,
      paddingVertical: spacing[2],
      alignItems: 'center',
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    dayTop: { ...typography.caption, color: colors.textMuted },
    dayNumber: { ...typography.subheading, color: colors.text },
    selected: { borderColor: colors.accent, backgroundColor: colors.accentSurface },
    pressed: { borderColor: colors.borderStrong },
    disabled: { opacity: 0.4 },
    textSelected: { color: colors.accent, fontFamily: fontFamilies.semiBold },
    clock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
    step: {
      width: controlHeight,
      height: controlHeight,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.full,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    sign: { ...typography.heading, color: colors.text },
    time: { ...typography.display, color: colors.text, flex: 1, textAlign: 'center' },
    hours: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
    hour: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      borderRadius: radii.full,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    hourText: { ...typography.body, color: colors.text },
    recap: { ...typography.small, color: colors.textMuted },
  });
