import { Injectable } from '@nestjs/common';
import { UserSessionRepository } from '../../domain/repository/UserSessionRepository';
import { AccessTokenService } from '../port/AccessTokenService';
import { Clock } from '../port/Clock';
import { RandomGenerator } from '../port/RandomGenerator';
import { SecretHasher } from '../port/SecretHasher';
import { addMs, DAY_MS } from '../helper/durations';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;

export interface IssuedSession {
  /** Sent in "Authorization: Bearer ..." on every call. */
  accessToken: string;
  accessTokenExpiresIn: number;
  /** Kept on the phone (secure storage), used once to get new tokens. */
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

/**
 * Opens a session for a user: a short access token (JWT, 15 min)
 * and a refresh token (30 days) whose hash is stored in session_utilisateur.
 */
@Injectable()
export class SessionIssuerService {
  constructor(
    private readonly sessions: UserSessionRepository,
    private readonly hasher: SecretHasher,
    private readonly random: RandomGenerator,
    private readonly accessTokens: AccessTokenService,
    private readonly clock: Clock,
  ) {}

  async issue(userId: number): Promise<IssuedSession> {
    const now = this.clock.now();
    const refreshToken = this.random.token();
    const refreshTokenExpiresAt = addMs(now, REFRESH_TOKEN_TTL_DAYS * DAY_MS);

    await this.sessions.create({
      utilisateurId: userId,
      jetonHash: this.hasher.hash(refreshToken),
      dateExpiration: refreshTokenExpiresAt,
      dateCreation: now,
    });
    const access = this.accessTokens.issue(userId, ACCESS_TOKEN_TTL_SECONDS);

    return {
      accessToken: access.token,
      accessTokenExpiresIn: access.expiresInSeconds,
      refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
    };
  }
}
