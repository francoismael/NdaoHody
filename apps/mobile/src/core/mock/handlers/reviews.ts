import type { Avis } from '@contract';

import { HttpError, idParam, optionalString, requireNumber, type MockRoute } from '../server';
import { iso } from '../time';
import { nextId } from '../types';
import { reservationParties } from '../views';

export const reviewsRoutes: MockRoute[] = [
  {
    method: 'POST',
    pattern: '/reviews',
    handler: (ctx): Avis => {
      const { reservation, chauffeurId } = reservationParties(ctx, requireNumber(ctx.body, 'reservationId'));
      // Validated rule: only the passenger rates, once, after a finished ride.
      if (ctx.userId !== reservation.passagerId) throw new HttpError(403, 'Seul le passager peut noter.');
      if (reservation.statut !== 'terminee') throw new HttpError(409, 'Tu pourras noter à la fin de la course.');
      if (ctx.db.avis.some((a) => a.reservationId === reservation.id)) throw new HttpError(409, 'Tu as déjà noté ce trajet.');
      const note = requireNumber(ctx.body, 'note');
      if (!Number.isInteger(note) || note < 1 || note > 5) throw new HttpError(400, 'La note va de 1 à 5.');
      const avis: Avis = {
        id: nextId(ctx.db, 'avis'),
        reservationId: reservation.id,
        auteurId: reservation.passagerId,
        cibleId: chauffeurId,
        note,
        commentaire: optionalString(ctx.body, 'commentaire'),
        dateAvis: iso(ctx.now),
      };
      ctx.db.avis.push(avis);
      return avis;
    },
  },
  {
    method: 'GET',
    pattern: '/users/:id/reviews',
    handler: (ctx): Avis[] =>
      ctx.db.avis.filter((a) => a.cibleId === idParam(ctx)).sort((a, b) => b.dateAvis.localeCompare(a.dateAvis)),
  },
];
