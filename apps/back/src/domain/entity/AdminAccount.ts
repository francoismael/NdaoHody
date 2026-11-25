import type { Administrateur, RoleAdmin } from '@contract';

/** A back-office account (table administrateur): the data object plus what never leaves the back. */
export type AdminAccount = Administrateur & {
  /** bcrypt hash. */
  motDePasse: string;
  echecsConnexion: number;
  bloqueJusqua: Date | null;
};

export type NewAdminAccount = Pick<AdminAccount, 'nomComplet' | 'email' | 'motDePasse' | 'role' | 'creePar'>;

export type AdminAccountChanges = Partial<
  Pick<AdminAccount, 'actif' | 'motDePasse' | 'echecsConnexion' | 'bloqueJusqua'> & { derniereConnexion: Date }
>;

/** The data object sent to the back-office (never the password hash). */
export function toAdministrateur(account: AdminAccount): Administrateur {
  return {
    id: account.id,
    nomComplet: account.nomComplet,
    email: account.email,
    role: account.role,
    actif: account.actif,
    creePar: account.creePar,
    derniereConnexion: account.derniereConnexion,
    dateCreation: account.dateCreation,
  };
}

/** Roles a super admin can create from the back-office. Super admins come from the create-super-admin command. */
export const CREATABLE_ROLES: readonly RoleAdmin[] = ['admin', 'investisseur'];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
