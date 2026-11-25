import { clearQueryCache } from '@/shared/query';
import { resetClock } from '@/shared/utils';

import { resetDb } from '../mock/db';
import { setMockFailureRate } from '../mock/request';
import { SIGNED_OUT, sessionStore } from '../session/sessionStore';
import { DEMO_DEFAULTS, demoStore } from './demoStore';

/**
 * One gesture to start the demo again: real time, default demo settings,
 * fresh dataset relative to now, empty query cache, signed out.
 * Real Mapbox roads are kept. Nothing keeps moving: the engine has no timer.
 */
export async function resetDemo(): Promise<void> {
  resetClock();
  demoStore.setState(DEMO_DEFAULTS);
  setMockFailureRate(0);
  await resetDb();
  await clearQueryCache();
  sessionStore.setState(SIGNED_OUT);
}
