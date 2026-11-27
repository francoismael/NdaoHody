import type { Badge } from '@contract';
import { isProfileComplete, type User } from './User';

export const PASSENGER_NEW_BELOW_RIDES = 3;
export const PASSENGER_TOP_FROM_RIDES = 20;
export const DRIVER_NEW_BELOW_RIDES = 5;
export const DRIVER_TOP_FROM_RIDES = 30;
export const TOP_MIN_RATING = 4.7;

export interface BadgeFacts {
  user: Pick<User, 'nom' | 'prenom' | 'sexe' | 'statutChauffeur' | 'coursesPassager' | 'coursesChauffeur' | 'absences' | 'noteMoyenne'>;
  /** The driver has at least one validated vehicle. */
  hasValidatedVehicle: boolean;
  /** Reports about him that an admin confirmed (status "traite"). */
  confirmedReports: number;
}

/**
 * Badge shown next to a user, always computed by the server.
 * A validated driver is judged as a driver; anybody else as a passenger.
 * Only passengers rate (drivers do not rate their passengers), so a passenger's "top" badge
 * rests on his rides and his reliability (no missed pickup), not on a rating.
 *
 * Passenger: non_verifie = incomplete profile; nouveau = fewer than 3 rides;
 *            top = 20 rides or more and never absent; verifie otherwise.
 * Driver:    non_verifie = no validated vehicle; nouveau = fewer than 5 rides;
 *            top = rating >= 4.7 over 30 rides or more, no confirmed report; verifie otherwise.
 */
export function computeBadge({ user, hasValidatedVehicle, confirmedReports }: BadgeFacts): Badge {
  if (user.statutChauffeur === 'valide') {
    if (!hasValidatedVehicle) return 'non_verifie';
    if (user.coursesChauffeur < DRIVER_NEW_BELOW_RIDES) return 'nouveau';
    const rated = user.noteMoyenne !== null && user.noteMoyenne >= TOP_MIN_RATING;
    if (rated && user.coursesChauffeur >= DRIVER_TOP_FROM_RIDES && confirmedReports === 0) return 'top';
    return 'verifie';
  }

  if (!isProfileComplete(user)) return 'non_verifie';
  if (user.coursesPassager < PASSENGER_NEW_BELOW_RIDES) return 'nouveau';
  if (user.coursesPassager >= PASSENGER_TOP_FROM_RIDES && user.absences === 0) return 'top';
  return 'verifie';
}

/** The badges worth a notification when reached. */
export function isUpgrade(previous: Badge, next: Badge): boolean {
  const rank: Record<Badge, number> = { non_verifie: 0, nouveau: 1, verifie: 2, top: 3 };
  return rank[next] > rank[previous] && rank[next] >= rank.verifie;
}
