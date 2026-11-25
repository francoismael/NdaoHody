import type { MockRoute } from '../server';

import { authRoutes } from './auth';
import { bookingsRoutes } from './bookings';
import { messagesRoutes } from './messages';
import { notificationsRoutes } from './notifications';
import { pricingRoutes } from './pricing';
import { profileRoutes } from './profile';
import { reviewsRoutes } from './reviews';
import { safetyRoutes } from './safety';
import { tripsRoutes } from './trips';
import { verificationRoutes } from './verification';

/** Every route of the simulated API (/api/v1). */
export const mockRoutes: MockRoute[] = [
  ...authRoutes,
  ...profileRoutes,
  ...verificationRoutes,
  ...tripsRoutes,
  ...pricingRoutes,
  ...bookingsRoutes,
  ...messagesRoutes,
  ...notificationsRoutes,
  ...reviewsRoutes,
  ...safetyRoutes,
];
