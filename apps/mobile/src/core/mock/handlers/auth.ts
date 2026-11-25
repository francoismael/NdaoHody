import type { Utilisateur } from '@contract';

import type { OtpRequest, OtpVerification } from '@/features/auth/types';
import { normalizePhoneNumber } from '@/shared/utils';

import { DEMO_OTP_CODE } from '../seed';
import { HttpError, requireString, type MockRoute } from '../server';
import { iso } from '../time';
import { nextId } from '../types';

/*
 * Same rules and messages as apps/back (RequestOtpUseCase, VerifyOtpUseCase).
 * Left out on purpose: the 5 codes per day limit (it would block demo rehearsals).
 */
const OTP_VALIDITY_SECONDS = 5 * 60;
const OTP_RESEND_DELAY_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 3;
const INVALID_PHONE_MESSAGE = 'Numéro de téléphone invalide. Exemple : 034 12 345 67.';
const EXPIRED_CODE_MESSAGE = 'Ce code a expiré. Demande un nouveau code.';
const TOO_MANY_ATTEMPTS_MESSAGE = "Trop d'essais avec ce code. Demande un nouveau code.";

interface SentCode {
  sentAtMs: number;
  failedAttempts: number;
}

/**
 * Codes sent and not used yet, by stored phone number. In memory only:
 * after an app restart the code is gone, like a lost SMS ("Ce code a expiré").
 */
const sentCodes = new Map<string, SentCode>();

function requirePhone(body: unknown): string {
  const telephone = normalizePhoneNumber(requireString(body, 'telephone'));
  if (!telephone) throw new HttpError(400, INVALID_PHONE_MESSAGE);
  return telephone;
}

const secondsBetween = (fromMs: number, toMs: number): number => Math.ceil((toMs - fromMs) / 1000);

function newUser(id: number, telephone: string, now: Date): Utilisateur {
  return {
    id,
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
  };
}

export const authRoutes: MockRoute[] = [
  {
    method: 'POST',
    pattern: '/auth/otp',
    handler: ({ body, now }): OtpRequest => {
      const telephone = requirePhone(body);
      const previous = sentCodes.get(telephone);
      if (previous) {
        const retryIn = secondsBetween(now.getTime(), previous.sentAtMs + OTP_RESEND_DELAY_SECONDS * 1000);
        if (retryIn > 0) throw new HttpError(429, `Un code vient d'être envoyé. Réessaie dans ${retryIn} s.`);
      }
      sentCodes.set(telephone, { sentAtMs: now.getTime(), failedAttempts: 0 });
      return { expiresInSeconds: OTP_VALIDITY_SECONDS, resendInSeconds: OTP_RESEND_DELAY_SECONDS };
    },
  },
  {
    method: 'POST',
    pattern: '/auth/otp/verify',
    handler: ({ db, now, body }): OtpVerification => {
      const telephone = requirePhone(body);
      const code = requireString(body, 'code');
      if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'Le code doit contenir 6 chiffres.');

      const sent = sentCodes.get(telephone);
      if (!sent || now.getTime() >= sent.sentAtMs + OTP_VALIDITY_SECONDS * 1000) {
        throw new HttpError(400, EXPIRED_CODE_MESSAGE);
      }
      if (sent.failedAttempts >= MAX_OTP_ATTEMPTS) throw new HttpError(429, TOO_MANY_ATTEMPTS_MESSAGE);
      if (code !== DEMO_OTP_CODE) {
        sent.failedAttempts += 1;
        const remaining = MAX_OTP_ATTEMPTS - sent.failedAttempts;
        if (remaining === 0) throw new HttpError(429, TOO_MANY_ATTEMPTS_MESSAGE);
        throw new HttpError(400, `Code incorrect. Encore ${remaining} essai(s).`);
      }
      sentCodes.delete(telephone);

      let utilisateur = db.utilisateurs.find((u) => u.telephone === telephone);
      if (!utilisateur) {
        utilisateur = newUser(nextId(db, 'utilisateur'), telephone, now);
        db.utilisateurs.push(utilisateur);
      }
      // No first name or no sex yet = sign-up not finished (interrupted sign-up, or an
      // account made before the sex was asked to everyone).
      const nouveau = utilisateur.prenom === null || utilisateur.sexe === null;
      return { utilisateur, nouveau, token: `mock-token-${utilisateur.id}` };
    },
  },
];
