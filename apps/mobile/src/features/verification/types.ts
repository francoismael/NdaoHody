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

/**
 * GET /me/vehicles: a vehicle, and whether a published or running trip uses it (then it can be
 * neither changed nor deleted). GAP #16 (to send to the backend): not in the contract; the back
 * refuses only the delete of such a vehicle.
 */
export type MyVehicle = Vehicule & { enTrajet: boolean };

/**
 * PATCH /me/vehicles/:id (back UpdateVehicleRequest): the description only, never the plate,
 * the type or the photo. Any change sends the vehicle back to the team.
 */
export type UpdateVehicleInput = Partial<Pick<Vehicule, 'marque' | 'modele' | 'couleur' | 'places' | 'parDefaut'>>;

/** POST /me/vehicles response (the back also sends `compteReactive`, never set in the demo). */
export interface AddVehicleResult {
  vehicule: Vehicule;
}
