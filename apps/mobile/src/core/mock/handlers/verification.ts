import type { DocumentChauffeur, TypeDocument, Utilisateur, Vehicule } from '@contract';

import {
  DOCUMENT_TYPES,
  VERIFICATION_MESSAGES as M,
  isValidSeatCount,
  latestDocuments,
  normalizeLicenseNumber,
  normalizePlateNumber,
} from '@/features/verification/rules';
import type { DriverApplication } from '@/features/verification/types';

import { HttpError, optionalString, requireNumber, requireOneOf, requireUser, type MockRoute, type RequestContext } from '../server';
import { iso } from '../time';
import { nextId, type MockDb } from '../types';

/**
 * Driver application, same rules and messages as the back (DriverController):
 * the licence front carries the number, every upload adds a row (the latest of each type counts),
 * and the application waits for an admin as soon as the 3 latest documents are there, none refused.
 * Not simulated: reactivating a deleted account that owned the licence or plate (no deleted account in the demo).
 */

export function assertDriverNotSuspended(user: Utilisateur): void {
  if (user.statutChauffeur === 'suspendu') throw new HttpError(403, M.suspended);
}

function assertDriverCanApply(user: Utilisateur): void {
  if (user.statutChauffeur === 'valide') throw new HttpError(403, M.alreadyValidated);
  assertDriverNotSuspended(user);
}

/** Stands for the multipart picture of the real API. */
function requirePicture(body: unknown, key: string): string {
  const uri = optionalString(body, key);
  if (!uri) throw new HttpError(400, M.imageRequired);
  return uri;
}

const documentsOf = (db: MockDb, userId: number): DocumentChauffeur[] => db.documents.filter((d) => d.utilisateurId === userId);

export function applicationOf(db: MockDb, user: Utilisateur): DriverApplication {
  return {
    statutChauffeur: user.statutChauffeur,
    numeroPermis: db.numerosPermis[user.id] ?? null,
    documents: latestDocuments(documentsOf(db, user.id)),
  };
}

/** The licence front comes first and carries the number. */
function readLicenseNumber(ctx: RequestContext, user: Utilisateur, type: TypeDocument): string | null {
  if (type !== 'permis_recto') {
    if (!ctx.db.numerosPermis[user.id]) throw new HttpError(400, M.licenseFrontFirst);
    return null;
  }
  const numero = normalizeLicenseNumber(optionalString(ctx.body, 'numeroPermis') ?? '');
  if (!numero) throw new HttpError(400, M.licenseInvalid);
  const owner = Object.entries(ctx.db.numerosPermis).find(([id, value]) => value === numero && Number(id) !== user.id);
  if (owner) throw new HttpError(409, M.licenseTaken);
  return numero;
}

/** en_attente as soon as the 3 latest documents are there and none of them is refused. */
function refreshDriverStatus(db: MockDb, user: Utilisateur): void {
  const latest = latestDocuments(documentsOf(db, user.id));
  if (latest.length === DOCUMENT_TYPES.length && latest.every((d) => d.statut !== 'refuse')) {
    user.statutChauffeur = 'en_attente';
  }
}

export const verificationRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: '/me/documents',
    handler: (ctx): DriverApplication => applicationOf(ctx.db, requireUser(ctx)),
  },
  {
    method: 'POST',
    pattern: '/me/documents',
    handler: (ctx): DriverApplication => {
      const user = requireUser(ctx);
      assertDriverCanApply(user);
      const type = requireOneOf(ctx.body, 'type', DOCUMENT_TYPES);
      const fichierUrl = requirePicture(ctx.body, 'fichierUrl');
      const numero = readLicenseNumber(ctx, user, type);
      if (numero) ctx.db.numerosPermis[user.id] = numero;
      ctx.db.documents.push({
        id: nextId(ctx.db, 'document'),
        utilisateurId: user.id,
        type,
        fichierUrl,
        statut: 'en_attente',
        motifRefus: null,
        dateEnvoi: iso(ctx.now),
      });
      refreshDriverStatus(ctx.db, user);
      return applicationOf(ctx.db, user);
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
    handler: (ctx): { vehicule: Vehicule } => {
      const user = requireUser(ctx);
      assertDriverNotSuspended(user);
      const photoUrl = requirePicture(ctx.body, 'photoUrl');
      const type = requireOneOf(ctx.body, 'type', ['moto', 'voiture'] as const);
      const immatriculation = normalizePlateNumber(optionalString(ctx.body, 'immatriculation') ?? '');
      if (!immatriculation) throw new HttpError(400, M.plateInvalid);
      const places = requireNumber(ctx.body, 'places');
      if (!isValidSeatCount(type, places)) throw new HttpError(400, M.seatsInvalid);
      const couleur = optionalString(ctx.body, 'couleur');
      if (!couleur) throw new HttpError(400, M.colorRequired);

      const samePlate = ctx.db.vehicules.find((v) => v.immatriculation === immatriculation && v.statut !== 'archive');
      if (samePlate) throw new HttpError(409, samePlate.utilisateurId === user.id ? M.plateAlreadyMine : M.plateTaken);

      const vehicule: Vehicule = {
        id: nextId(ctx.db, 'vehicule'),
        utilisateurId: user.id,
        type,
        marque: optionalString(ctx.body, 'marque'),
        modele: optionalString(ctx.body, 'modele'),
        couleur,
        immatriculation,
        places,
        photoUrl,
        parDefaut: !ctx.db.vehicules.some((v) => v.utilisateurId === user.id && v.statut !== 'archive'),
        statut: 'en_attente',
        motifRefus: null,
      };
      ctx.db.vehicules.push(vehicule);
      return { vehicule };
    },
  },
];
