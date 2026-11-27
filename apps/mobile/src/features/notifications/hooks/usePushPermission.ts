import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { dismissPushPrompt, getPushPermission, isPushPromptDismissed, requestPushPermission } from '../services/pushService';
import type { PushPermission } from '../types';

export type UsePushPermission = {
  /** null while it is read. */
  permission: PushPermission | null;
  /** The dialog was closed once ("Plus tard", "Compris"): it no longer opens by itself. null while read. */
  dismissed: boolean | null;
  /** System prompt (the channel is created before it). */
  request: () => Promise<PushPermission>;
  dismiss: () => void;
  openSettings: () => void;
};

/** The notification permission, read again when the user comes back from the settings. */
export function usePushPermission(): UsePushPermission {
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void isPushPromptDismissed().then((value) => {
      if (alive) setDismissed(value);
    });
    const read = () => {
      void getPushPermission().then((value) => {
        if (alive) setPermission(value);
      });
    };
    read();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  const request = useCallback(async () => {
    const value = await requestPushPermission();
    setPermission(value);
    return value;
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    void dismissPushPrompt();
  }, []);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return { permission, dismissed, request, dismiss, openSettings };
}
