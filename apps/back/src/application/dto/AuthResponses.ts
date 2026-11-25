import type { IssuedSession } from '../service/SessionIssuerService';
import type { MeResponse } from './MeResponse';

/** POST /auth/otp: the SMS was sent. */
export interface OtpSentResponse {
  /** The code stops working after this many seconds. */
  expiresInSeconds: number;
  /** A new code can be asked after this many seconds. */
  resendInSeconds: number;
}

/** POST /auth/otp/verify: the user is signed in. */
export interface SignInResponse extends IssuedSession {
  utilisateur: MeResponse;
  /** true: the account was just created, the app asks for the profile. */
  nouveau: boolean;
}

/** POST /auth/refresh: new tokens (the old refresh token no longer works). */
export type RefreshResponse = IssuedSession;
