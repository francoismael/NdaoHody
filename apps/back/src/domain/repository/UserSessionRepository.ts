import type { NewUserSession, UserSession } from '../entity/UserSession';

export abstract class UserSessionRepository {
  abstract create(session: NewUserSession): Promise<UserSession>;

  abstract findByTokenHash(jetonHash: string): Promise<UserSession | null>;

  abstract revoke(id: number, at: Date): Promise<void>;

  /** Signs the user out of every device. */
  abstract revokeAllForUser(utilisateurId: number, at: Date): Promise<void>;
}
