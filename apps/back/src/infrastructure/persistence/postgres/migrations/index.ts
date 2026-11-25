import { InitialSchema1795478400000 } from './1795478400000-initial-schema';
import { DistanceBasedPricing1795584052742 } from './1795584052742-distance-based-pricing';
import { UserSessions1795586605794 } from './1795586605794-user-sessions';
import { DriverIdentityAndAdminLock1795588919382 } from './1795588919382-driver-identity-and-admin-lock';

/**
 * Every migration, in order. The back is bundled by webpack, so migrations
 * cannot be found by a file glob: each new migration must be added here.
 */
export const MIGRATIONS = [
  InitialSchema1795478400000,
  DistanceBasedPricing1795584052742,
  UserSessions1795586605794,
  DriverIdentityAndAdminLock1795588919382,
];
