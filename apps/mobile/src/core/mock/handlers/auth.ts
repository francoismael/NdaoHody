import type { Utilisateur } from '@contract';

import type { OtpRequest, OtpVerification } from '@/features/auth/types';

import { DEMO_OTP_CODE } from '../seed';
import { HttpError, requireString, type MockRoute } from '../server';
import { iso } from '../time';
import { nextId } from '../types';

/** Malagasy mobile numbers: +261 then 32, 33, 34, 37, 38 or 39, then 7 digits. */
const PHONE_PATTERN = /^\+2613[234789]\d{7}$/;

function requirePhone(body: unknown): string {
  const telephone = requireString(body, 'telephone').replace(/\s/g, '');
  if (!PHONE_PATTERN.test(telephone)) throw new HttpError(400, 'Numéro invalide. Exemple : 034 12 345 67.');
  return telephone;
}

export const authRoutes: MockRoute[] = [
  {
    method: 'POST',
    pattern: '/auth/otp',
    handler: ({ body }): OtpRequest => {
      requirePhone(body);
      return { expiresInSeconds: 300 };
    },
  },
  {
    method: 'POST',
    pattern: '/auth/otp/verify',
    handler: ({ db, now, body }): OtpVerification => {
      const telephone = requirePhone(body);
      if (requireString(body, 'code') !== DEMO_OTP_CODE) throw new HttpError(400, 'Code incorrect. Vérifie le SMS.');
      let utilisateur = db.utilisateurs.find((u) => u.telephone === telephone);
      if (!utilisateur) {
        utilisateur = {
          id: nextId(db, 'utilisateur'),
          telephone,
          nom: null,
          prenom: null,
          sexe: null,
          photoUrl: null,
          modeActuel: 'passager',
          statutChauffeur: 'aucun',
          statut: 'actif',
          badge: 'nouveau',
          noteMoyenne: null,
          nombreNotes: 0,
          coursesPassager: 0,
          coursesChauffeur: 0,
          absences: 0,
          telephoneVerifie: true,
          dateCreation: iso(now),
        } satisfies Utilisateur;
        db.utilisateurs.push(utilisateur);
      }
      return { utilisateur, nouveau: utilisateur.prenom === null, token: `mock-token-${utilisateur.id}` };
    },
  },
];
