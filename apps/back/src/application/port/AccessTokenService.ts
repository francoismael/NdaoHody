export interface AccessToken {
  token: string;
  expiresInSeconds: number;
}

/** Port: issues and checks the short-lived access tokens (JWT) of the native app. */
export abstract class AccessTokenService {
  abstract issue(accountId: number, expiresInSeconds: number): AccessToken;

  /** The account id, or null when the token is invalid or expired. */
  abstract verify(token: string): number | null;
}

/**
 * Port: same contract for the back-office, with another secret and audience,
 * so a token of the app never opens the back-office (and the other way round).
 */
export abstract class AdminTokenService extends AccessTokenService {}
