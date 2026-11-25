import { Injectable } from '@nestjs/common';
import { DomainException } from '../../../domain/exception/DomainException';
import { UserSessionRepository } from '../../../domain/repository/UserSessionRepository';
import { UserRepository } from '../../../domain/repository/UserRepository';
import type { RefreshResponse } from '../../dto/AuthResponses';
import { Clock } from '../../port/Clock';
import { SecretHasher } from '../../port/SecretHasher';
import { UnitOfWork } from '../../port/UnitOfWork';
import { assertAccountActive, SESSION_EXPIRED_MESSAGE } from '../../helper/accountStatus';
import { SessionIssuerService } from '../../service/SessionIssuerService';

/**
 * POST /auth/refresh: swaps a refresh token for new tokens (rotation).
 * A refresh token works only once: when an already used one comes back,
 * it was probably stolen, so every session of the user is closed.
 */
@Injectable()
export class RefreshSessionUseCase {
  constructor(
    private readonly sessions: UserSessionRepository,
    private readonly users: UserRepository,
    private readonly hasher: SecretHasher,
    private readonly issuer: SessionIssuerService,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(refreshToken: string): Promise<RefreshResponse> {
    const now = this.clock.now();
    const session = await this.sessions.findByTokenHash(this.hasher.hash(refreshToken));
    if (!session || session.dateExpiration <= now) {
      throw new DomainException('unauthorized', SESSION_EXPIRED_MESSAGE);
    }
    if (session.dateRevocation) {
      await this.sessions.revokeAllForUser(session.utilisateurId, now);
      throw new DomainException('unauthorized', SESSION_EXPIRED_MESSAGE);
    }

    const user = await this.users.findById(session.utilisateurId);
    assertAccountActive(user);

    return this.unitOfWork.run(async () => {
      await this.sessions.revoke(session.id, now);
      return this.issuer.issue(user.id);
    });
  }
}
