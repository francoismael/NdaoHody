import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { keyValueStorage } from '@/shared/storage';
import { getClockState, restoreClock, subscribeClock, type ClockState } from '@/shared/utils';

/** Demo settings, set from the demo panel. Saved, so a restart keeps the same demo. */
export interface DemoSettings {
  /** The simulated driver accepts the demo user's requests on his own. */
  autoAccept: boolean;
  /** After this many seconds of demo clock (must stay under the 3 min expiry). */
  autoAcceptSeconds: number;
  clock: ClockState | null;
}

export const DEMO_DEFAULTS: DemoSettings = { autoAccept: true, autoAcceptSeconds: 20, clock: null };

/** Bounds for autoAcceptSeconds: past 170 s the request would expire first. */
export const AUTO_ACCEPT_RANGE: [number, number] = [5, 170];

export const demoStore = createStore<DemoSettings>()(
  persist(() => DEMO_DEFAULTS, {
    name: 'ndaohody:demo',
    storage: createJSONStorage(() => keyValueStorage),
    version: 1,
    onRehydrateStorage: () => (state?: DemoSettings) => {
      if (state) restoreClock(state.clock);
    },
  }),
);

// The clock lives in shared (screens read it); its demo settings are saved here.
subscribeClock(() => demoStore.setState({ clock: getClockState() }));
