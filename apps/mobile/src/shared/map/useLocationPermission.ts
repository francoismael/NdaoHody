import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

export type LocationPermissionStatus = 'checking' | 'undetermined' | 'granted' | 'denied';

/** Permission + état du GPS. Ne connaît rien du covoiturage. */
export function useLocationPermission() {
  const [status, setStatus] = useState<LocationPermissionStatus>('checking');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [servicesEnabled, setServicesEnabled] = useState(true);

  const apply = useCallback((res: Location.LocationPermissionResponse) => {
    if (res.granted) setStatus('granted');
    else if (res.status === Location.PermissionStatus.UNDETERMINED) setStatus('undetermined');
    else setStatus('denied');
    setCanAskAgain(res.canAskAgain);
  }, []);

  const check = useCallback(async () => {
    apply(await Location.getForegroundPermissionsAsync());
    setServicesEnabled(await Location.hasServicesEnabledAsync());
  }, [apply]);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, [check]);

  // Le volet rapide d'Android ne met pas l'app en arrière-plan : on revérifie tant que le GPS est coupé.
  useEffect(() => {
    if (servicesEnabled) return;
    const id = setInterval(() => void check(), 3000);
    return () => clearInterval(id);
  }, [servicesEnabled, check]);

  const request = useCallback(async () => {
    if (!canAskAgain) {
      await Linking.openSettings();
      return;
    }
    apply(await Location.requestForegroundPermissionsAsync());
  }, [apply, canAskAgain]);

  /** Android : boîte système « Activer la localisation ». Ailleurs : réglages. */
  const enableServices = useCallback(async () => {
    try {
      if (Platform.OS === 'android') await Location.enableNetworkProviderAsync();
      else await Linking.openSettings();
    } catch {
      // Refus : la carte reste centrée sur Tana.
    }
    await check();
  }, [check]);

  return { status, canAskAgain, request, servicesEnabled, enableServices };
}