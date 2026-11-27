import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useSession } from '@/features/auth';

import { pushTarget, type PushTarget } from '../pushTarget';
import { preparePush, subscribePushTaps, takeLaunchTap } from '../services/pushService';

/**
 * Opens the screen of a tapped notification: app open, in the background or closed.
 * Order (documented traps): wait for the saved session and the navigator, switch the role
 * (or the role guard sends back home), then navigate. The state decides, navigation follows.
 */
export function usePushObserver(appReady: boolean): void {
  const router = useRouter();
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const { signedIn, userId, role, setRole } = useSession();
  const pending = useRef<PushTarget | null>(null);
  const launchRead = useRef(false);
  const [taps, setTaps] = useState(0);

  useEffect(() => {
    void preparePush();
  }, []);

  useEffect(
    () =>
      subscribePushTaps((data) => {
        pending.current = pushTarget(data);
        setTaps((count) => count + 1);
      }),
    [],
  );

  useEffect(() => {
    if (!appReady || !navigationReady) return;
    if (!launchRead.current) {
      launchRead.current = true;
      const launch = takeLaunchTap();
      if (launch) pending.current = pushTarget(launch);
    }
    const target = pending.current;
    if (!target) return;
    // A push belongs to one account: ignored if another one is signed in now.
    if (!signedIn || target.utilisateurId !== userId) {
      pending.current = null;
      return;
    }
    if (role !== target.role) {
      setRole(target.role); // next render: the guard lets the role's screens in, then we navigate
      return;
    }
    pending.current = null;
    router.push(target.href);
  }, [appReady, navigationReady, signedIn, userId, role, setRole, router, taps]);
}
