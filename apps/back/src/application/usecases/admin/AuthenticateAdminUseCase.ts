import { Injectable } from '@nestjs/common';
import type { AdminAccount } from '../../../domain/entity/AdminAccount';
import { DomainException } from '../../../domain/exception/DomainException';
import { AdminAccountRepository } from '../../../domain/repository/AdminAccountRepository';
import { AdminTokenService } from '../../port/AccessTokenService';

const ADMIN_SESSION_EXPIRED_MESSAGE = 'Ta session a expiré. Reconnecte-toi.';

/**
 * Used by the guard of the back-office routes: access token -> active admin account.
 * Read on every call, so a deactivated account loses access at once.
 */
@Injectable()
export class AuthenticateAdminUseCase {
  constructor(
    private readonly tokens: AdminTokenService,
    private readonly accounts: AdminAccountRepository,
  ) {}

  async execute(token: string): Promise<AdminAccount> {
    const accountId = this.tokens.verify(token);
    const account = accountId === null ? null : await this.accounts.findById(accountId);
    if (!account) {
      throw new DomainException('unauthorized', ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    if (!account.actif) {
      throw new DomainException('forbidden', 'Ce compte est désactivé. Contacte le super admin.');
    }
    return account;
  }
}
