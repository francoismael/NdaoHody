/**
 * A signed-in device (table session_utilisateur), identified by its refresh token.
 * Only the hash of the refresh token is stored.
 */
export interface UserSession {
  id: number;
  utilisateurId: number;
  jetonHash: string;
  dateExpiration: Date;
  /** Set on sign-out, on rotation (refresh) and when the account is suspended or deleted. */
  dateRevocation: Date | null;
  dateCreation: Date;
}

export type NewUserSession = Pick<UserSession, 'utilisateurId' | 'jetonHash' | 'dateExpiration' | 'dateCreation'>;
