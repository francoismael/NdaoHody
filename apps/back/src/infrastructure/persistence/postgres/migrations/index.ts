import { InitialSchema1795478400000 } from './1795478400000-initial-schema';
import { DistanceBasedPricing1795584052742 } from './1795584052742-distance-based-pricing';

/**
 * Every migration, in order. The back is bundled by webpack, so migrations
 * cannot be found by a file glob: each new migration must be added here.
 */
export const MIGRATIONS = [InitialSchema1795478400000, DistanceBasedPricing1795584052742];
