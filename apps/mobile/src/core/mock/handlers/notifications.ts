import type { Notification } from '@contract';

import { HttpError, requireUser, type MockRoute } from '../server';

export const notificationsRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: '/me/notifications',
    handler: (ctx): Notification[] =>
      ctx.db.notifications
        .filter((n) => n.utilisateurId === requireUser(ctx).id)
        .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation)),
  },
  {
    method: 'POST',
    pattern: '/notifications/:id/read',
    handler: (ctx): Notification => {
      const userId = requireUser(ctx).id;
      const notification = ctx.db.notifications.find((n) => n.id === ctx.params.id && n.utilisateurId === userId);
      if (!notification) throw new HttpError(404, 'Notification introuvable.');
      notification.lu = true;
      return notification;
    },
  },
  {
    method: 'POST',
    pattern: '/me/notifications/read-all',
    handler: (ctx): { lues: number } => {
      const userId = requireUser(ctx).id;
      const unread = ctx.db.notifications.filter((n) => n.utilisateurId === userId && !n.lu);
      unread.forEach((n) => {
        n.lu = true;
      });
      return { lues: unread.length };
    },
  },
];
