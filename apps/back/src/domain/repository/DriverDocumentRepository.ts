import type { StatutValidation } from '@contract';
import type { DriverDocument, NewDriverDocument } from '../entity/DriverDocument';

export abstract class DriverDocumentRepository {
  abstract listByUser(utilisateurId: number): Promise<DriverDocument[]>;

  abstract create(document: NewDriverDocument): Promise<DriverDocument>;

  /** Sets the admin decision on these documents. */
  abstract review(
    ids: readonly number[],
    decision: { statut: StatutValidation; motifRefus: string | null; verifiePar: number },
  ): Promise<void>;
}
