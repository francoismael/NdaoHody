import type { AlerteSos, LienSuivi } from '@contract';

import { isRecord } from '@/shared/utils';

import { idParam, requireUser, type MockRoute } from '../server';
import { iso } from '../time';
import { nextId } from '../types';
import { reservationParties } from '../views';

const numberOrNull = (body: unknown, key: string): number | null => {
  const value = isRecord(body) ? body[key] : undefined;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const randomToken = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const safetyRoutes: MockRoute[] = [
  {
    method: 'POST',
    pattern: '/sos',
    handler: (ctx): AlerteSos => {
      const user = requireUser(ctx);
      const reservationId = numberOrNull(ctx.body, 'reservationId');
      if (reservationId !== null) reservationParties(ctx, reservationId);
      const alerte: AlerteSos = {
        id: nextId(ctx.db, 'sos'),
        utilisateurId: user.id,
        reservationId,
        latitude: numberOrNull(ctx.body, 'latitude'),
        longitude: numberOrNull(ctx.body, 'longitude'),
        statut: 'ouvert',
        traitePar: null,
        note: null,
        dateAlerte: iso(ctx.now),
      };
      ctx.db.alertesSos.push(alerte);
      return alerte;
    },
  },
  {
    method: 'POST',
    pattern: '/reservations/:id/tracking-link',
    handler: (ctx): LienSuivi => {
      const { reservation } = reservationParties(ctx, idParam(ctx));
      const existing = ctx.db.liensSuivi.find((l) => l.reservationId === reservation.id);
      if (existing) return existing;
      const jeton = randomToken();
      const lien: LienSuivi = {
        id: nextId(ctx.db, 'lienSuivi'),
        reservationId: reservation.id,
        jeton,
        url: `https://ndaohody.mg/suivi/${jeton}`,
        consultations: 0,
        dateCreation: iso(ctx.now),
        dateExpiration: null,
      };
      ctx.db.liensSuivi.push(lien);
      return lien;
    },
  },
];
