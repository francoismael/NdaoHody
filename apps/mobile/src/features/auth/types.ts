import type { Mode, Utilisateur } from '@contract';

/** Active space: one account, two spaces. Same values as the API (`Mode`). */
export type Role = Mode;

/** App state (not server data): kept in Zustand, saved on the device. */
export type Session = {
  signedIn: boolean;
  role: Role;
  userId: number | null;
};

/** POST /auth/otp: the SMS was sent. Not in data-objets.ts yet (to confirm with the backend). */
export type OtpRequest = { expiresInSeconds: number };

/** POST /auth/otp/verify. Not in data-objets.ts yet (to confirm with the backend). */
export type OtpVerification = {
  utilisateur: Utilisateur;
  /** true: ask the full name before the home screen. */
  nouveau: boolean;
  token: string;
};
