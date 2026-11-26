import type { DocumentChauffeur, TypeDocument, Utilisateur, Vehicule } from '@contract';

import {
  DOCUMENT_TYPES,
  VERIFICATION_MESSAGES as M,
  canAddVehicle,
  isCountedVehicle,
  isValidSeatCount,
  latestDocuments,
  normalizeLicenseNumber,
  normalizePlateNumber,
} from '@/features/verification/rules';
import type { DriverApplication, MyVehicle } from '@/features/verification/types';

import { ACTIVE_TRIP_STATUSES } from '@/features/trips/rules';

import {
  HttpError,
  idParam,
  optionalBoolean,
  optionalNumber,
  optionalString,
  requireNumber,
  requireOneOf,
  requireUser,
  type MockRoute,
  type RequestContext,
} from '../server';
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
    // Like the back (listByOwner): archived vehicles are gone for the driver. + enTrajet (GAP #16).
    handler: (ctx): MyVehicle[] =>
      ctx.db.vehicules
        .filter((v) => v.utilisateurId === requireUser(ctx).id && isCountedVehicle(v))
        .map((v) => ({ ...v, enTrajet: vehicleInUse(ctx.db, v.id) })),
  },
  {
    method: 'POST',
    pattern: '/me/vehicles',
    handler: (ctx): { vehicule: Vehicule } => {
      const user = requireUser(ctx);
      assertDriverNotSuspended(user);
      if (!canAddVehicle(ctx.db.vehicules.filter((v) => v.utilisateurId === user.id))) throw new HttpError(409, M.tooManyVehicles);
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
  {
    // Back ManageVehiclesUseCase.update: description only (no plate, type or photo).
    method: 'PATCH',
    pattern: '/me/vehicles/:id',
    handler: (ctx): Vehicule => {
      const user = requireUser(ctx);
      assertDriverNotSuspended(user);
      const vehicule = ownVehicle(ctx, user);
      const places = optionalNumber(ctx.body, 'places') ?? vehicule.places;
      if (!isValidSeatCount(vehicule.type, places)) throw new HttpError(400, M.seatsInvalid);
      const couleur = optionalString(ctx.body, 'couleur');
      const next = {
        marque: optionalString(ctx.body, 'marque') ?? vehicule.marque,
        modele: optionalString(ctx.body, 'modele') ?? vehicule.modele,
        couleur: couleur ?? vehicule.couleur,
        places,
      };
      const changed = (Object.keys(next) as (keyof typeof next)[]).some((key) => next[key] !== vehicule[key]);
      // Validated rule (26/11): its description does not change while a trip uses it (the back
      // refuses only the delete): GAP #16. Choosing it as the default one stays possible.
      if (changed && vehicleInUse(ctx.db, vehicule.id)) throw new HttpError(409, M.vehicleInUse);
      Object.assign(vehicule, next);
      // Validated rule (26/11): after any change the team checks it again. The back does it from
      // 'valide' only; here a refused vehicle goes back too (else it could never be re-checked): GAP #16.
      if (changed && (vehicule.statut === 'valide' || vehicule.statut === 'refuse')) {
        vehicule.statut = 'en_attente';
        vehicule.motifRefus = null;
      }
      if (optionalBoolean(ctx.body, 'parDefaut') && !vehicule.parDefaut) {
        ctx.db.vehicules.forEach((v) => {
          if (v.utilisateurId === user.id) v.parDefaut = v.id === vehicule.id;
        });
      }
      return vehicule;
    },
  },
  {
    // Back ManageVehiclesUseCase.archive: archived, never deleted (the plate stays tied to this driver).
    method: 'DELETE',
    pattern: '/me/vehicles/:id',
    handler: (ctx): null => {
      const user = requireUser(ctx);
      const vehicule = ownVehicle(ctx, user);
      if (vehicleInUse(ctx.db, vehicule.id)) throw new HttpError(409, M.vehicleInUse);
      vehicule.statut = 'archive';
      if (vehicule.parDefaut) {
        vehicule.parDefaut = false;
        const next = ctx.db.vehicules.find((v) => v.utilisateurId === user.id && isCountedVehicle(v));
        if (next) next.parDefaut = true;
      }
      return null;
    },
  },
];

/** A published or running trip uses this vehicle (back: isUsedByActiveTrip). */
const vehicleInUse = (db: MockDb, vehicleId: number): boolean =>
  db.trajets.some((t) => t.vehiculeId === vehicleId && ACTIVE_TRIP_STATUSES.includes(t.statut));

function ownVehicle(ctx: RequestContext, user: Utilisateur): Vehicule {
  const id = idParam(ctx);
  const vehicule = ctx.db.vehicules.find((v) => v.id === id && v.utilisateurId === user.id && isCountedVehicle(v));
  if (!vehicule) throw new HttpError(404, M.vehicleNotFound);
  return vehicule;
}
