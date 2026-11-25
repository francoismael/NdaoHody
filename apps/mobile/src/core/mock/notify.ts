import type { Notification, TypeNotification } from '@contract';

import { iso } from './time';
import { nextId, type MockDb } from './types';

/** Adds a notification, as the server would before sending the push. */
export function notify(
  db: MockDb,
  now: Date,
  utilisateurId: number,
  type: TypeNotification,
  titre: string,
  message: string,
  donnees: Notification['donnees'] = {},
): Notification {
  const notification: Notification = {
    id: `notif-${nextId(db, 'notification')}`,
    utilisateurId,
    type,
    titre,
    message,
    donnees,
    lu: false,
    dateCreation: iso(now),
  };
  db.notifications.push(notification);
  return notification;
}
