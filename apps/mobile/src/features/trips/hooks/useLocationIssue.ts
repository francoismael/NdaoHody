import { useLocationPermission } from '@/shared/map';
import type { IconName } from '@/shared/ui';

// On Android the system box has its own text: we explain BEFORE asking.
// One card for both things the position needs (the app's permission, the phone's GPS):
// a button for each one still to do; a step already done is not shown.
const TITLE = 'Accès à ta position';
const TEXT =
  'Profite d’une meilleure expérience en activant ta localisation. NdaoHody reste utilisable sans, mais les options de la carte seront limitées.';
/** Driver home: one short line above the buttons; shorter still when the panel is tall. */
const NOTE = 'Autorise ta position et active ton GPS pour profiter pleinement de l’app.';
const SHORT_NOTE = 'Autorise ta position et active ton GPS.';

/** One thing the position still needs, with the action that does it. */
export type LocationStep = {
  label: string;
  icon: IconName;
  onPress: () => Promise<void>;
  /** The button spins until the action is over (the GPS box, then the check): the step or the whole card then goes. */
  waits?: boolean;
};

/** What blocks the position: why it matters (full text, or the notes of the light card) and the steps left. */
export type LocationIssue = { title: string; text: string; note: string; shortNote: string; steps: LocationStep[] };

export type LocationState = {
  /** Permission granted AND GPS on. */
  located: boolean;
  /** Still reading the permission (first render). */
  checking: boolean;
  issue: LocationIssue | null;
};

/** The home's location state, shared by the driver and the passenger homes. */
export function useLocationIssue(): LocationState {
  const { status, canAskAgain, request, servicesEnabled, enableServices } = useLocationPermission();
  const allowed = status === 'granted';
  const located = allowed && servicesEnabled;
  const steps: LocationStep[] = [];
  // Refused for good: only the settings can change it (request opens them).
  if (!allowed) steps.push({ label: status === 'denied' && !canAskAgain ? 'Ouvrir les réglages' : 'Autoriser ma position', icon: 'settings', onPress: request });
  // The phone's GPS itself: the location icon (the permission is an app setting).
  if (!servicesEnabled) steps.push({ label: 'Activer la localisation', icon: 'map-pin', onPress: enableServices, waits: true });
  const issue = status === 'checking' || located ? null : { title: TITLE, text: TEXT, note: NOTE, shortNote: SHORT_NOTE, steps };
  return { located, checking: status === 'checking', issue };
}
