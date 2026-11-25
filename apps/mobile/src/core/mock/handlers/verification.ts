import type { DocumentChauffeur, TypeDocument, Vehicule } from '@contract';

import { optionalString, requireNumber, requireOneOf, requireString, requireUser, type MockRoute, type RequestContext } from '../server';
import { iso } from '../time';
import { nextId } from '../types';

const DOCUMENT_TYPES: readonly TypeDocument[] = ['permis_recto', 'permis_verso', 'selfie'];

/** Complete file (3 documents + 1 vehicle) -> waiting for the back-office. */
function updateDriverStatus(ctx: RequestContext): void {
  const user = requireUser(ctx);
  const docs = ctx.db.documents.filter((d) => d.utilisateurId === user.id && d.statut !== 'refuse');
  const complete = DOCUMENT_TYPES.every((type) => docs.some((d) => d.type === type));
  const hasVehicle = ctx.db.vehicules.some((v) => v.utilisateurId === user.id && v.statut !== 'archive');
  if (complete && hasVehicle && (user.statutChauffeur === 'aucun' || user.statutChauffeur === 'refuse')) {
    user.statutChauffeur = 'en_attente';
  }
}

export const verificationRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: '/me/documents',
    handler: (ctx): DocumentChauffeur[] => ctx.db.documents.filter((d) => d.utilisateurId === requireUser(ctx).id),
  },
  {
    method: 'POST',
    pattern: '/me/documents',
    handler: (ctx): DocumentChauffeur => {
      const user = requireUser(ctx);
      const type = requireOneOf(ctx.body, 'type', DOCUMENT_TYPES);
      // A new photo replaces the previous one of the same type.
      ctx.db.documents = ctx.db.documents.filter((d) => !(d.utilisateurId === user.id && d.type === type));
      const document: DocumentChauffeur = {
        id: nextId(ctx.db, 'document'),
        utilisateurId: user.id,
        type,
        fichierUrl: requireString(ctx.body, 'fichierUrl'),
        statut: 'en_attente',
        motifRefus: null,
        dateEnvoi: iso(ctx.now),
      };
      ctx.db.documents.push(document);
      updateDriverStatus(ctx);
      return document;
    },
  },
  {
    method: 'GET',
    pattern: '/me/vehicles',
    handler: (ctx): Vehicule[] => ctx.db.vehicules.filter((v) => v.utilisateurId === requireUser(ctx).id),
  },
  {
    method: 'POST',
    pattern: '/me/vehicles',
    handler: (ctx): Vehicule => {
      const user = requireUser(ctx);
      const type = requireOneOf(ctx.body, 'type', ['moto', 'voiture'] as const);
      const isFirst = !ctx.db.vehicules.some((v) => v.utilisateurId === user.id);
      const vehicule: Vehicule = {
        id: nextId(ctx.db, 'vehicule'),
        utilisateurId: user.id,
        type,
        marque: optionalString(ctx.body, 'marque'),
        modele: optionalString(ctx.body, 'modele'),
        couleur: requireString(ctx.body, 'couleur'),
        immatriculation: requireString(ctx.body, 'immatriculation').toUpperCase(),
        places: type === 'moto' ? 1 : Math.min(Math.max(Math.round(requireNumber(ctx.body, 'places')), 1), 8),
        photoUrl: optionalString(ctx.body, 'photoUrl') ?? '',
        parDefaut: isFirst,
        statut: 'en_attente',
        motifRefus: null,
      };
      ctx.db.vehicules.push(vehicule);
      updateDriverStatus(ctx);
      return vehicule;
    },
  },
];
