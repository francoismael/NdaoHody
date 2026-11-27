import type { Notification, TypeNotification } from '@contract';

import { iso } from './time';
import { nextId, type MockDb } from './types';

type PushSender = (notification: Notification) => void;

/** One push channel (the back's UserNotifier, FCM later). A new sender replaces the old one. */
let pushSender: PushSender | null = null;

/** core/push plugs the phone in here: every notification the server creates is sent to it. */
export function setPushSender(sender: PushSender): void {
  pushSender = sender;
}

/** Stores a notification without sending it (the seed's history: what happened before the demo). */
export function addNotification(
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

/** Adds a notification, then sends the push, as the server would. */
export function notify(...args: Parameters<typeof addNotification>): Notification {
  const notification = addNotification(...args);
  pushSender?.(notification);
  return notification;
}
