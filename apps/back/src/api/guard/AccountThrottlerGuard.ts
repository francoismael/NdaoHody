import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import type { Request } from 'express';
import { AccessTokenService, AdminTokenService } from '../../application/port/AccessTokenService';
import { readBearerToken } from './bearerToken';

/**
 * Rate limit per account for a signed-in user, per IP address otherwise.
 * In Madagascar many phones share the operator's IP address:
 * limiting signed-in users by IP would block people who have nothing to do with each other.
 */
@Injectable()
export class AccountThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly accessTokens: AccessTokenService,
    private readonly adminTokens: AdminTokenService,
  ) {
    super(options, storage, reflector);
  }

  /** WebSocket messages (positions every 5 s) are not counted: the connection itself needs a valid token. */
  override canActivate(context: ExecutionContext): Promise<boolean> {
    return context.getType() === 'http' ? super.canActivate(context) : Promise.resolve(true);
  }

  protected override async getTracker(request: Record<string, unknown>): Promise<string> {
    const httpRequest = request as unknown as Request;
    const token = readBearerToken(httpRequest);
    if (token) {
      // The token is verified: a forged one must not use up the budget of another account.
      const userId = this.accessTokens.verify(token);
      if (userId !== null) {
        return `user:${userId}`;
      }
      const adminId = this.adminTokens.verify(token);
      if (adminId !== null) {
        return `admin:${adminId}`;
      }
    }
    return `ip:${httpRequest.ip ?? 'unknown'}`;
  }
}
