/** Rôle actif de l'utilisateur. Un seul compte, deux espaces. */
export type Role = 'passenger' | 'driver';

export type Session = {
  signedIn: boolean;
  role: Role;
};
