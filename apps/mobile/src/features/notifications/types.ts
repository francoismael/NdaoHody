import type { Notification } from '@contract';

/** What a push carries: the contract's `donnees` (screen to open), plus who it is for and why. */
export type PushData = Pick<Notification, 'utilisateurId' | 'type'> & Notification['donnees'];

/** Can the phone show our notifications? `canAskAgain: false`: only the system settings can change it. */
export interface PushPermission {
  granted: boolean;
  canAskAgain: boolean;
}
