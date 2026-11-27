import type { CodeEnvoye } from '@contract';
import type { IssuedSession } from '../service/SessionIssuerService';
import type { MeResponse } from './MeResponse';

/** POST /auth/otp: the code was sent, "canal" says through which channel. */
export type OtpSentResponse = CodeEnvoye;

/** POST /auth/otp/verify: the user is signed in. */
export interface SignInResponse extends IssuedSession {
  utilisateur: MeResponse;
  /** true: the account was just created, the app asks for the profile. */
  nouveau: boolean;
}

/** POST /auth/refresh: new tokens (the old refresh token no longer works). */
export type RefreshResponse = IssuedSession;
