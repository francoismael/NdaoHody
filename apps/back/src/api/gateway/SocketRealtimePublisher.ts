import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';
import { RealtimeEvent, RealtimePublisher } from '../../application/port/RealtimePublisher';

export const userRoom = (userId: number): string => `user:${userId}`;

/**
 * RealtimePublisher over Socket.IO: each connection of a user is in the room "user:<id>".
 * LiveGateway attaches the namespace when it starts; before that (or in a script) events are dropped.
 */
@Injectable()
export class SocketRealtimePublisher extends RealtimePublisher {
  private namespace: Namespace | null = null;

  attach(namespace: Namespace): void {
    this.namespace = namespace;
  }

  toUser(userId: number, event: RealtimeEvent, payload: object): void {
    this.namespace?.to(userRoom(userId)).emit(event, payload);
  }
}
