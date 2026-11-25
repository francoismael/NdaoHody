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

  /** true while the user rides as a passenger or drives a trip that has started. */
  abstract hasRideInProgress(id: number): Promise<boolean>;
}
