import { clearQueryCache } from '@/shared/query';

import { resetDb } from '../mock/db';
import { SIGNED_OUT, sessionStore } from '../session/sessionStore';

/**
 * One gesture to start the demo again: fresh dataset relative to now,
 * empty query cache, signed out. Real Mapbox roads are kept.
 */
export async function resetDemo(): Promise<void> {
  await resetDb();
  await clearQueryCache();
  sessionStore.setState(SIGNED_OUT);
}
