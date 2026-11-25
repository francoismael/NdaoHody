import type { Utilisateur } from '@contract';

/** A user of the native app (table utilisateur): the data object plus the fields only the back uses. */
export type User = Utilisateur & {
  /** Driving licence number, unique across all accounts (deleted ones included). */
  numeroPermis: string | null;
};

/** Fields the back can change on an account. */
export type UserChanges = Partial<
  Pick<User, 'nom' | 'prenom' | 'sexe' | 'photoUrl' | 'modeActuel' | 'statut' | 'statutChauffeur' | 'telephone' | 'numeroPermis'>
>;

/** Last name, first name and sex are required before booking (old accounts may lack them). */
export function isProfileComplete(user: Pick<User, 'nom' | 'prenom' | 'sexe'>): boolean {
  return Boolean(user.nom && user.prenom && user.sexe);
}

/**
 * Value written in place of the phone number of a deleted account,
 * so the same number can sign up again. Fits in telephone VARCHAR(20).
 */
export function deletedPhoneNumber(userId: number): string {
  return `supprime:${userId}`;
}
