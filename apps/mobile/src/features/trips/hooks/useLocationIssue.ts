import { useLocationPermission } from '@/shared/map';
import type { IconName } from '@/shared/ui';

// On Android the system box has its own text: we explain BEFORE asking.
const ASK = {
  title: 'Autorise ta position',
  text: 'Pour une meilleure expérience, autorise NdaoHody à utiliser ta position : tu verras les trajets et les chauffeurs près de toi. Sans ta position, la carte reste centrée sur Tana.',
};
const DENIED = {
  title: 'Localisation désactivée',
  text: 'Active la localisation pour avoir une meilleure expérience. Sans ta position, la carte reste centrée sur Tana et tu ne vois pas ce qui se passe près de toi.',
};
const GPS_OFF = {
  title: 'Localisation coupée',
  text: 'Active la localisation de ton téléphone pour avoir une meilleure expérience. Sans ta position, la carte reste centrée sur Tana et tu ne vois pas ce qui se passe près de toi.',
};

/** What blocks the position, with the one action that fixes it (and its icon). */
export type LocationIssue = { title: string; text: string; action: string; icon: IconName; onPress: () => void };

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
  const located = status === 'granted' && servicesEnabled;
  let issue: LocationIssue | null = null;
  if (status === 'undetermined') issue = { ...ASK, action: 'Autoriser ma position', icon: 'settings', onPress: request };
  else if (status === 'denied') issue = { ...DENIED, action: canAskAgain ? 'Réessayer' : 'Ouvrir les réglages', icon: 'settings', onPress: request };
  // The phone's GPS itself: the location icon (the others are app settings).
  else if (status === 'granted' && !servicesEnabled) issue = { ...GPS_OFF, action: 'Activer la localisation', icon: 'map-pin', onPress: enableServices };
  return { located, checking: status === 'checking', issue };
}
