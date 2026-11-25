export type DevicePlatform = 'android' | 'ios';

export const DEVICE_PLATFORMS: readonly DevicePlatform[] = ['android', 'ios'];

/** Port: FCM tokens of the phones of each user, used to send push notifications (MongoDB). */
export abstract class DeviceRegistry {
  /** A token belongs to one user only: registering it again moves it to this user. */
  abstract register(utilisateurId: number, jeton: string, plateforme: DevicePlatform): Promise<void>;

  abstract unregister(utilisateurId: number, jeton: string): Promise<void>;

  abstract unregisterAll(utilisateurId: number): Promise<void>;
}
