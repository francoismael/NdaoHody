import { Injectable } from '@nestjs/common';
import { UserSessionRepository } from '../../../domain/repository/UserSessionRepository';
import { Clock } from '../../port/Clock';
import { SecretHasher } from '../../port/SecretHasher';

/**
 * POST /auth/logout: closes the session of this phone.
 * Always succeeds, even with an unknown token, so it reveals nothing.
 */
@Injectable()
export class SignOutUseCase {
  constructor(
    private readonly sessions: UserSessionRepository,
    private readonly hasher: SecretHasher,
    private readonly clock: Clock,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    const session = await this.sessions.findByTokenHash(this.hasher.hash(refreshToken));
    if (session && !session.dateRevocation) {
      await this.sessions.revoke(session.id, this.clock.now());
    }
  }
}
