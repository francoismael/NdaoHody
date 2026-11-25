import type { DocumentChauffeur, StatutChauffeur, TypeDocument, Vehicule } from '@contract';

/**
 * GET /me/documents and POST /me/documents: where the driver application stands.
 * Same shape as the back's DriverApplicationResponse (not in data-objets.ts).
 */
export interface DriverApplication {
  statutChauffeur: StatutChauffeur;
  numeroPermis: string | null;
  /** Latest document of each type. */
  documents: DocumentChauffeur[];
}

/** POST /me/documents. `fichierUrl`: saved photo URI today, multipart "fichier" tomorrow. */
export interface UploadDocumentInput {
  type: TypeDocument;
  fichierUrl: string;
  /** Required with permis_recto. */
  numeroPermis?: string;
}

/** POST /me/vehicles. `photoUrl`: saved photo URI today, multipart "photo" tomorrow. */
export type CreateVehicleInput = Pick<Vehicule, 'type' | 'marque' | 'modele' | 'couleur' | 'immatriculation' | 'places' | 'photoUrl'>;

/** POST /me/vehicles response (the back also sends `compteReactive`, never set in the demo). */
export interface AddVehicleResult {
  vehicule: Vehicule;
}
