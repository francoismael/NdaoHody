import type { StatutChauffeur } from '@contract';
import type { User, UserChanges } from '../entity/User';

export abstract class UserRepository {
  abstract findById(id: number): Promise<User | null>;

  abstract findByPhone(telephone: string): Promise<User | null>;

  /** Searches every account, deleted ones included. */
  abstract findByLicenseNumber(numeroPermis: string): Promise<User | null>;

  /** Accounts whose driver application has this status, oldest account first. */
  abstract listByDriverStatus(statutChauffeur: StatutChauffeur): Promise<User[]>;

  /** Creates an account whose phone number has just been verified by SMS. */
  abstract createWithVerifiedPhone(telephone: string, dateCreation: Date): Promise<User>;

  abstract update(id: number, changes: UserChanges): Promise<User>;

  /** One more finished ride, as a passenger or as a driver. */
  abstract countRide(id: number, as: 'passager' | 'chauffeur'): Promise<void>;

  /** One more missed pickup (the driver waited and marked him absent). */
  abstract countAbsence(id: number): Promise<void>;

  /** Average rating and number of ratings computed again from the reviews he received. */
  abstract refreshRating(id: number): Promise<void>;

  /** true while the user rides as a passenger or drives a trip that has started. */
  abstract hasRideInProgress(id: number): Promise<boolean>;
}
