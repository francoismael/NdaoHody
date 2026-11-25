import type { Notification } from '@contract';

export type NewNotification = Pick<Notification, 'utilisateurId' | 'type' | 'titre' | 'message' | 'donnees'>;

/**
 * Port: tells a user something (history in MongoDB; push by FCM at step 12).
 * A failure must never cancel the action that triggered the notification.
 */
export abstract class UserNotifier {
  abstract notify(notification: NewNotification): Promise<void>;
}
