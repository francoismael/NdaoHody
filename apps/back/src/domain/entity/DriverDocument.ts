import type { StatutValidation, TypeDocument } from '@contract';

export const DRIVER_DOCUMENT_TYPES: readonly TypeDocument[] = ['permis_recto', 'permis_verso', 'selfie'];

/**
 * A document sent by a driver (table document_chauffeur).
 * `fichierUrl` holds the key of a PRIVATE file: the API only gives temporary links to it.
 * Every upload adds a row; the latest row of each type is the one checked by an admin.
 */
export interface DriverDocument {
  id: number;
  utilisateurId: number;
  type: TypeDocument;
  fichierUrl: string;
  statut: StatutValidation;
  motifRefus: string | null;
  verifiePar: number | null;
  dateEnvoi: Date;
}

export type NewDriverDocument = Pick<DriverDocument, 'utilisateurId' | 'type' | 'fichierUrl' | 'dateEnvoi'>;

/** Latest document of each type, in the order permis_recto, permis_verso, selfie. */
export function latestDocuments(documents: readonly DriverDocument[]): DriverDocument[] {
  const newestFirst = [...documents].sort(
    (a, b) => b.dateEnvoi.getTime() - a.dateEnvoi.getTime() || b.id - a.id,
  );
  return DRIVER_DOCUMENT_TYPES.flatMap((type) => {
    const latest = newestFirst.find((document) => document.type === type);
    return latest ? [latest] : [];
  });
}

/** true when the driver has sent a licence (both sides) and a selfie. */
export function hasEveryDocument(documents: readonly DriverDocument[]): boolean {
  return latestDocuments(documents).length === DRIVER_DOCUMENT_TYPES.length;
}
