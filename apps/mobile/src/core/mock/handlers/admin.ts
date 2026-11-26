import type { TypeDocument } from '@contract';

import { DOCUMENT_TYPES, latestDocuments } from '@/features/verification/rules';
import type { DriverApplication } from '@/features/verification/types';
import { isRecord } from '@/shared/utils';

import { notify } from '../notify';
import { HttpError, findOr404, idParam, optionalString, type MockRoute, type RequestContext } from '../server';
import { applicationOf } from './verification';

/**
 * The back-office, played by the demo panel only (real paths: /api/admin/drivers/... and /api/admin/vehicles/...).
 * Same rules and messages as ReviewDriverApplicationsUseCase and ReviewVehiclesUseCase.
 */

function findPendingApplicant(ctx: RequestContext) {
  const id = idParam(ctx);
  const user = findOr404(ctx.db.utilisateurs, (u) => u.id === id && u.statut !== 'supprime', 'Utilisateur');
  if (user.statutChauffeur !== 'en_attente') throw new HttpError(409, "Ce dossier n'est pas en attente de validation.");
  return { user, latest: latestDocuments(ctx.db.documents.filter((d) => d.utilisateurId === user.id)) };
}

/** RejectDriverRequest.documents: refused documents (default: all). */
function refusedTypes(body: unknown): readonly TypeDocument[] {
  const value = isRecord(body) ? body.documents : undefined;
  if (!Array.isArray(value) || value.length === 0) return DOCUMENT_TYPES;
  const asked: readonly unknown[] = value;
  return DOCUMENT_TYPES.filter((type) => asked.includes(type));
}

export const adminRoutes: MockRoute[] = [
  {
    method: 'POST',
    pattern: '/admin/drivers/:id/approve',
    handler: (ctx): DriverApplication => {
      const { user, latest } = findPendingApplicant(ctx);
      if (latest.length !== DOCUMENT_TYPES.length) {
        throw new HttpError(409, 'Le dossier est incomplet : permis recto, verso et selfie sont nécessaires.');
      }
      latest.forEach((document) => {
        document.statut = 'valide';
        document.motifRefus = null;
      });
      user.statutChauffeur = 'valide';
      notify(ctx.db, ctx.now, user.id, 'kyc_valide', 'Dossier chauffeur validé', 'Tu peux maintenant publier des trajets.');
      return applicationOf(ctx.db, user);
    },
  },
  {
    method: 'POST',
    pattern: '/admin/drivers/:id/reject',
    handler: (ctx): DriverApplication => {
      const { user, latest } = findPendingApplicant(ctx);
      const motif = optionalString(ctx.body, 'motif');
      if (!motif || motif.length < 3 || motif.length > 255) throw new HttpError(400, 'Le motif doit faire de 3 à 255 caractères.');
      const types = refusedTypes(ctx.body);
      latest
        .filter((document) => types.includes(document.type))
        .forEach((document) => {
          document.statut = 'refuse';
          document.motifRefus = motif;
        });
      user.statutChauffeur = 'refuse';
      notify(ctx.db, ctx.now, user.id, 'kyc_refuse', 'Dossier chauffeur refusé', `${motif}. Renvoie les documents concernés.`);
      return applicationOf(ctx.db, user);
    },
  },
  {
    method: 'POST',
    pattern: '/admin/vehicles/:id/approve',
    handler: (ctx) => {
      const id = idParam(ctx);
      const vehicule = findOr404(ctx.db.vehicules, (v) => v.id === id, 'Véhicule');
      if (vehicule.statut !== 'en_attente') throw new HttpError(409, "Ce véhicule n'est pas en attente de validation.");
      vehicule.statut = 'valide';
      vehicule.motifRefus = null;
      notify(ctx.db, ctx.now, vehicule.utilisateurId, 'kyc_valide', 'Véhicule validé', `Ton véhicule ${vehicule.immatriculation} est validé.`);
      return { vehicule };
    },
  },
  {
    // Back AdminVehiclesController.reject: a vehicle refused on its own, with a reason the driver sees.
    method: 'POST',
    pattern: '/admin/vehicles/:id/reject',
    handler: (ctx) => {
      const id = idParam(ctx);
      const vehicule = findOr404(ctx.db.vehicules, (v) => v.id === id, 'Véhicule');
      if (vehicule.statut !== 'en_attente') throw new HttpError(409, "Ce véhicule n'est pas en attente de validation.");
      const motif = optionalString(ctx.body, 'motif');
      if (!motif || motif.length < 3 || motif.length > 255) throw new HttpError(400, 'Le motif doit faire de 3 à 255 caractères.');
      vehicule.statut = 'refuse';
      vehicule.motifRefus = motif;
      notify(ctx.db, ctx.now, vehicule.utilisateurId, 'kyc_refuse', 'Véhicule refusé', `${vehicule.immatriculation} : ${motif}.`);
      return { vehicule };
    },
  },
];
