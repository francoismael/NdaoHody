import type { Conversation, Message } from '@contract';

import { notify } from '../notify';
import { HttpError, findOr404, idParam, requireString, requireUser, type MockRoute, type RequestContext } from '../server';
import { iso } from '../time';
import { nextId } from '../types';
import { reservationParties, userById } from '../views';

function conversationFor(ctx: RequestContext) {
  const conversation = findOr404(ctx.db.conversations, (c) => c.id === idParam(ctx), 'Conversation');
  const parties = reservationParties(ctx, conversation.reservationId);
  return { conversation, ...parties };
}

export const messagesRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: '/me/conversations',
    handler: (ctx): Conversation[] => {
      const userId = requireUser(ctx).id;
      return ctx.db.conversations.filter((c) => {
        const reservation = ctx.db.reservations.find((r) => r.id === c.reservationId);
        const trajet = ctx.db.trajets.find((t) => t.id === reservation?.trajetId);
        return reservation?.passagerId === userId || trajet?.chauffeurId === userId;
      });
    },
  },
  { method: 'GET', pattern: '/conversations/:id', handler: (ctx): Conversation => conversationFor(ctx).conversation },
  {
    method: 'POST',
    pattern: '/conversations/:id/messages',
    handler: (ctx): Message => {
      const author = requireUser(ctx);
      const { conversation, passagerId, chauffeurId, reservation } = conversationFor(ctx);
      const contenu = requireString(ctx.body, 'contenu');
      if (contenu.length > 1000) throw new HttpError(400, 'Message trop long (1 000 caractères au plus).');
      const message: Message = {
        id: nextId(ctx.db, 'message'),
        conversationId: conversation.id,
        auteurId: author.id,
        type: 'texte',
        contenu,
        audioUrl: null,
        audioSecondes: null,
        lu: false,
        dateEnvoi: iso(ctx.now),
      };
      conversation.messages.push(message);
      const recipient = author.id === passagerId ? chauffeurId : passagerId;
      notify(ctx.db, ctx.now, recipient, 'nouveau_message', `Nouveau message de ${userById(ctx, author.id).prenom ?? ''}`.trim(), contenu, { reservationId: reservation.id });
      return message;
    },
  },
  {
    method: 'POST',
    pattern: '/conversations/:id/read',
    handler: (ctx): Conversation => {
      const { conversation } = conversationFor(ctx);
      conversation.messages.forEach((m) => {
        if (m.auteurId !== ctx.userId) m.lu = true;
      });
      return conversation;
    },
  },
];
