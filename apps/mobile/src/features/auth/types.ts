import type { Mode, Sexe, Utilisateur } from '@contract';

/** Active space: one account, two spaces. Same values as the API (`Mode`). */
export type Role = Mode;

/** App state (not server data): kept in Zustand, saved on the device. */
export type Session = {
  signedIn: boolean;
  role: Role;
  userId: number | null;
};

/**
 * POST /auth/otp: the SMS was sent. Same shape as `OtpSentResponse` in apps/back
 * (GAP #4: not in data-objets.ts yet).
 */
export type OtpRequest = {
  /** The code stops working after this many seconds. */
  expiresInSeconds: number;
  /** A new code can be asked after this many seconds. */
  resendInSeconds: number;
};

/**
 * POST /auth/otp/verify. GAP #4: apps/back answers `SignInResponse` (tokens + utilisateur + nouveau);
 * the simulation only needs `utilisateur` and `nouveau`.
 */
export type OtpVerification = {
  utilisateur: Utilisateur;
  /** true: ask the name before the home screen. */
  nouveau: boolean;
  token: string;
};

/**
 * Last step of a sign-up: the name (first name required, last name optional, like the PWA)
 * and the sex (required for everyone, like the back; it cannot be changed afterwards).
 */
export type SignUpName = { prenom: string; nom: string | null; sexe: Sexe };
