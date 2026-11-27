import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { describeError } from '../../application/helper/bestEffort';
import { readId, readPosition } from '../../application/helper/readPosition';
import { AuthenticateUserUseCase } from '../../application/usecases/auth/AuthenticateUserUseCase';
import { ShareDriverPositionUseCase } from '../../application/usecases/tracking/ShareDriverPositionUseCase';
import { SharePassengerPositionUseCase } from '../../application/usecases/tracking/SharePassengerPositionUseCase';
import type { User } from '../../domain/entity/User';
import { DomainException } from '../../domain/exception/DomainException';
import { SocketRealtimePublisher, userRoom } from './SocketRealtimePublisher';

/** Answer sent back to the app for each message it sends (Socket.IO acknowledgement). */
type Ack = { ok: true } | { ok: false; message: string };

const BAD_POSITION_MESSAGE = 'Position invalide : { latitude, longitude } attendus.';

/**
 * Real time for the app: Socket.IO on the namespace /live (ws://<host>/live).
 * The app connects with its access token (auth: { token }); each connection joins the room of its
 * account only, so nobody can receive the positions of a trip that is not his.
 * The use cases push events through SocketRealtimePublisher, which this gateway plugs in at start.
 */
@WebSocketGateway({ namespace: '/live', cors: { origin: true } })
export class LiveGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger('Live');

  constructor(
    private readonly authenticate: AuthenticateUserUseCase,
    private readonly driverPositions: ShareDriverPositionUseCase,
    private readonly passengerPositions: SharePassengerPositionUseCase,
    private readonly publisher: SocketRealtimePublisher,
  ) {}

  afterInit(namespace: Namespace): void {
    this.publisher.attach(namespace);
  }

  /** Refuses the connection without a valid token or with a suspended account. */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = await this.authenticate.execute(readToken(client));
      client.data = { user };
      await client.join(userRoom(user.id));
    } catch (error) {
      client.emit('error', { message: error instanceof DomainException ? error.message : 'Connexion refusée.' });
      client.disconnect(true);
    }
  }

  /** The driver's phone, every 5 s: { latitude, longitude }. */
  @SubscribeMessage('driver-position')
  async onDriverPosition(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<Ack> {
    const position = readPosition(body);
    if (!position) {
      return { ok: false, message: BAD_POSITION_MESSAGE };
    }
    return this.run(() => this.driverPositions.execute(userOf(client), position));
  }

  /** The passenger's phone while the driver comes: { reservationId, latitude, longitude }. */
  @SubscribeMessage('passenger-position')
  async onPassengerPosition(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<Ack> {
    const position = readPosition(body);
    const reservationId = readId(typeof body === 'object' && body !== null ? (body as { reservationId?: unknown }).reservationId : undefined);
    if (!position || reservationId === null) {
      return { ok: false, message: 'Position invalide : { reservationId, latitude, longitude } attendus.' };
    }
    return this.run(() => this.passengerPositions.execute(userOf(client), reservationId, position));
  }

  private async run(work: () => Promise<void>): Promise<Ack> {
    try {
      await work();
      return { ok: true };
    } catch (error) {
      if (error instanceof DomainException) {
        return { ok: false, message: error.message };
      }
      this.logger.error(describeError(error));
      return { ok: false, message: 'Une erreur est survenue. Réessaie dans un instant.' };
    }
  }
}

function readToken(client: Socket): string {
  const fromAuth: unknown = client.handshake.auth?.['token'];
  if (typeof fromAuth === 'string' && fromAuth.length > 0) {
    return fromAuth.replace(/^Bearer /, '');
  }
  const header = client.handshake.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
}

function userOf(client: Socket): User {
  return (client.data as { user: User }).user;
}
