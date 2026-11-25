import type { Administrateur, DocumentChauffeur, StatutChauffeur, Vehicule } from '@contract';

export interface AdminSignInResponse {
  accessToken: string;
  expiresInSeconds: number;
  administrateur: Administrateur;
}

/** The temporary password is shown once: the super admin hands it to the person. */
export interface AdminAccountWithPasswordResponse {
  administrateur: Administrateur;
  motDePasseTemporaire: string;
}

/**
 * A driver application in the back-office queue.
 * For an investisseur, every personal field is null and `documents` is empty.
 */
export interface DriverApplicationView {
  utilisateurId: number;
  nom: string | null;
  prenom: string | null;
  telephone: string | null;
  photoUrl: string | null;
  numeroPermis: string | null;
  statutChauffeur: StatutChauffeur;
  documents: DocumentChauffeur[];
  dateCreation: string;
}

/** A vehicle waiting for validation. For an investisseur: no plate, no photo, no owner name. */
export interface VehicleView {
  vehicule: Omit<Vehicule, 'immatriculation' | 'photoUrl'> & { immatriculation: string | null; photoUrl: string | null };
  proprietaire: { utilisateurId: number; nom: string | null; prenom: string | null };
}
