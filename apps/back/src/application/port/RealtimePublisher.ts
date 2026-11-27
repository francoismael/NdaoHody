/** Events sent to the app in real time (names shared with the mobile app, see data-objets.ts). */
export type RealtimeEvent =
  | 'tracking-update'
  | 'passenger-position'
  | 'booking-requested'
  | 'booking-updated'
  | 'location-required';

/**
 * Port: pushes an event to every open connection of a user (WebSocket today).
 * Never throws: a user without open connection simply receives nothing (the notification history stays).
 */
export abstract class RealtimePublisher {
  abstract toUser(userId: number, event: RealtimeEvent, payload: object): void;
}
