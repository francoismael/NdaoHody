import type { DocumentChauffeur } from '@contract';
import type { DriverDocument } from '../../domain/entity/DriverDocument';
import type { PrivateFileStorage } from '../port/PrivateFileStorage';

/** Links to a licence or a selfie stop working after this time. */
export const DOCUMENT_LINK_TTL_SECONDS = 10 * 60;

/** The data object, with a temporary link instead of the private file key. */
export function toDocumentChauffeur(document: DriverDocument, storage: PrivateFileStorage): DocumentChauffeur {
  return {
    id: document.id,
    utilisateurId: document.utilisateurId,
    type: document.type,
    fichierUrl: storage.temporaryUrl(document.fichierUrl, DOCUMENT_LINK_TTL_SECONDS),
    statut: document.statut,
    motifRefus: document.motifRefus,
    dateEnvoi: document.dateEnvoi.toISOString(),
  };
}
