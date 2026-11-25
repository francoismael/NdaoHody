import type { DocumentChauffeur, StatutChauffeur } from '@contract';
import type { Vehicle } from '../../domain/entity/Vehicle';
import type { ReactivatedAccount } from '../service/AccountRecoveryService';

/** GET /me/documents: where the driver application stands. */
export interface DriverApplicationResponse {
  statutChauffeur: StatutChauffeur;
  numeroPermis: string | null;
  /** Latest document of each type, with links valid for 10 minutes. */
  documents: DocumentChauffeur[];
}

/**
 * When `compteReactive` is set, the licence or plate belonged to the driver's old (deleted) account:
 * that account is active again, and the app must replace its tokens by `compteReactive.session`.
 */
export interface SubmitDocumentResponse extends DriverApplicationResponse {
  compteReactive: ReactivatedAccount | null;
}

export interface AddVehicleResponse {
  vehicule: Vehicle;
  compteReactive: ReactivatedAccount | null;
}
