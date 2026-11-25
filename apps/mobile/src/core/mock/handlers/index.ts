import type { MockRoute } from '../server';

import { adminRoutes } from './admin';
import { authRoutes } from './auth';
import { bookingsRoutes } from './bookings';
import { messagesRoutes } from './messages';
import { notificationsRoutes } from './notifications';
import { pricingRoutes } from './pricing';
import { profileRoutes } from './profile';
import { reviewsRoutes } from './reviews';
import { rideRoutes } from './ride';
import { safetyRoutes } from './safety';
import { tripsRoutes } from './trips';
import { verificationRoutes } from './verification';

/** Every route of the simulated API (/api/v1), plus the back-office played by the demo panel. */
export const mockRoutes: MockRoute[] = [
  ...authRoutes,
  ...profileRoutes,
  ...verificationRoutes,
  ...tripsRoutes,
  ...pricingRoutes,
  ...bookingsRoutes,
  ...rideRoutes,
  ...messagesRoutes,
  ...notificationsRoutes,
  ...reviewsRoutes,
  ...safetyRoutes,
  ...adminRoutes,
];
