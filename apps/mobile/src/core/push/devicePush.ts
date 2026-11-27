import type { Notification, TypeNotification } from '@contract';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PushData, PushPermission } from '@/features/notifications/types';
import { readJson, writeJson } from '@/shared/storage';
import { isRecord } from '@/shared/utils';

import { setPushSender } from '../mock/notify';
import { sessionStore } from '../session/sessionStore';

/**
 * Real notifications on the phone (expo-notifications, SDK 58), for the simulated server's pushes.
 * Order that matters on Android 13+: the channel first, then the permission (no prompt before a channel).
 */

/**
 * Created once: after the first install only its name and description can change.
 * Changing importance, sound or vibration needs the app to be uninstalled.
 */
export const BOOKINGS_CHANNEL_ID = 'bookings';

/** The booking pushes (bloc 8). The other types stay in the in-app list until their block. */
const PUSHED_TYPES: readonly TypeNotification[] = [
  'nouvelle_demande',
  'demande_acceptee',
  'demande_refusee',
  'demande_expiree',
  'reservation_annulee',
];

/*
 * At import, not in a component: the foreground handler and the server subscription must
 * exist before the first push, and come back by themselves when Fast Refresh reloads this
 * file or notify.ts (a subscription made once in an effect would be lost). One sender: a
 * reload replaces it, never two pushes for one notification.
 * Foreground: always shown (in the demo the app is always open). Sound on: on Android,
 * without sound the banner does not drop down.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
setPushSender((notification) => {
  void presentPush(notification);
});

let prepared: Promise<void> | null = null;

/** The channel, once per app run (before any permission request). Safe to call many times. */
export function preparePush(): Promise<void> {
  if (prepared) return prepared;
  prepared =
    Platform.OS === 'android'
      ? Notifications.setNotificationChannelAsync(BOOKINGS_CHANNEL_ID, {
          name: 'Demandes et réservations',
          description: 'Nouvelle demande, réservation acceptée, refusée ou expirée.',
          importance: Notifications.AndroidImportance.MAX,
          // No `sound` key: here it names a custom sound file. Left out = the phone's default sound.
          enableVibrate: true,
          vibrationPattern: [0, 250, 250, 250],
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
        }).then(
          () => undefined,
          (error: unknown) => {
            prepared = null; // the next call tries again
            throw error;
          },
        )
      : Promise.resolve();
  return prepared;
}

/**
 * The explaining dialog shows by itself once; after "Plus tard" or "Compris", only the banner
 * remains (it opens the dialog again). Saved on the device; the demo reset clears it.
 */
export const PUSH_PROMPT_DISMISSED_KEY = 'ndaohody:push-prompt-dismissed';

export async function isPushPromptDismissed(): Promise<boolean> {
  return (await readJson(PUSH_PROMPT_DISMISSED_KEY)) === true;
}

export const dismissPushPrompt = (): Promise<void> => writeJson(PUSH_PROMPT_DISMISSED_KEY, true);

const toPermission = ({ granted, canAskAgain }: Notifications.NotificationPermissionsStatus): PushPermission => ({ granted, canAskAgain });

export async function getPushPermission(): Promise<PushPermission> {
  await preparePush();
  return toPermission(await Notifications.getPermissionsAsync());
}

/** Shows the system prompt (after the channel exists). Refused: the app works, without pushes. */
export async function requestPushPermission(): Promise<PushPermission> {
  await preparePush();
  return toPermission(await Notifications.requestPermissionsAsync());
}

/**
 * A push reaches only its addressee's phone: here, the signed-in account.
 * Shown at once (channel-aware trigger = immediate, no exact alarm needed).
 */
async function presentPush(notification: Notification): Promise<void> {
  if (!PUSHED_TYPES.includes(notification.type)) return;
  if (notification.utilisateurId !== sessionStore.getState().userId) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const data: PushData = { utilisateurId: notification.utilisateurId, type: notification.type, ...notification.donnees };
  await Notifications.scheduleNotificationAsync({
    content: { title: notification.titre, body: notification.message, data, sound: 'default' },
    trigger: { channelId: BOOKINGS_CHANNEL_ID },
  });
}

/* Taps: two entries (documented trap). A listener while the app runs, the last response at a cold start. */

/** Each tap is handled once, whatever entry sees it first. */
const handledTaps = new Set<string>();

function toPushData(data: unknown): PushData | null {
  if (!isRecord(data) || typeof data.utilisateurId !== 'number') return null;
  const type = PUSHED_TYPES.find((t) => t === data.type);
  if (type === undefined) return null;
  return {
    utilisateurId: data.utilisateurId,
    type,
    ...(typeof data.reservationId === 'number' ? { reservationId: data.reservationId } : {}),
    ...(typeof data.trajetId === 'number' ? { trajetId: data.trajetId } : {}),
  };
}

function readTap(response: Notifications.NotificationResponse | null): PushData | null {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const id = response.notification.request.identifier;
  if (handledTaps.has(id)) return null;
  handledTaps.add(id);
  return toPushData(response.notification.request.content.data);
}

/** Tap while the app is open or in the background. */
export function subscribePushTaps(listener: (data: PushData) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = readTap(response);
    Notifications.clearLastNotificationResponse(); // or it fires again at the next launch
    if (data) listener(data);
  });
  return () => subscription.remove();
}

/** Tap that opened the closed app: read once, then cleared. */
export function takeLaunchTap(): PushData | null {
  const data = readTap(Notifications.getLastNotificationResponse());
  Notifications.clearLastNotificationResponse();
  return data;
}
