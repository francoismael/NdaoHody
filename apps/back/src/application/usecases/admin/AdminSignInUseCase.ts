import { Injectable } from '@nestjs/common';
import { normalizeEmail, toAdministrateur } from '../../../domain/entity/AdminAccount';
import { DomainException } from '../../../domain/exception/DomainException';
import { AdminAccountRepository } from '../../../domain/repository/AdminAccountRepository';
import type { AdminSignInResponse } from '../../dto/AdminResponses';
import { AdminTokenService } from '../../port/AccessTokenService';
import { Clock } from '../../port/Clock';
import { PasswordHasher } from '../../port/PasswordHasher';
import { addMs, HOUR_MS, MINUTE_MS, secondsUntil } from '../../helper/durations';

export const MAX_FAILED_SIGN_INS = 5;
export const LOCK_MINUTES = 15;
export const ADMIN_TOKEN_TTL_SECONDS = (8 * HOUR_MS) / 1000;

const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou mot de passe incorrect.';
/** Compared when the e-mail is unknown, so the answer takes as long as for a real account. */
const UNKNOWN_ACCOUNT_HASH = '$2b$10$cCB0iGbrToOyet9D9u5c..ISViIb4eRm8Dv7BaCPk0tZEQiuz6YMa';

/** POST /admin/auth/login: e-mail + password; the account is locked 15 min after 5 wrong passwords. */
@Injectable()
export class AdminSignInUseCase {
  constructor(
    private readonly accounts: AdminAccountRepository,
    private readonly passwords: PasswordHasher,
    private readonly tokens: AdminTokenService,
    private readonly clock: Clock,
  ) {}

  async execute(email: string, password: string): Promise<AdminSignInResponse> {
    const now = this.clock.now();
    const account = await this.accounts.findByEmail(normalizeEmail(email));
    if (!account) {
      await this.passwords.verify(password, UNKNOWN_ACCOUNT_HASH);
      throw new DomainException('unauthorized', INVALID_CREDENTIALS_MESSAGE);
    }
    if (account.bloqueJusqua && account.bloqueJusqua > now) {
      throw this.locked(now, account.bloqueJusqua);
    }

    if (!(await this.passwords.verify(password, account.motDePasse))) {
      const failures = account.echecsConnexion + 1;
      if (failures >= MAX_FAILED_SIGN_INS) {
        const lockedUntil = addMs(now, LOCK_MINUTES * MINUTE_MS);
        await this.accounts.update(account.id, { echecsConnexion: 0, bloqueJusqua: lockedUntil });
        throw this.locked(now, lockedUntil);
      }
      await this.accounts.update(account.id, { echecsConnexion: failures });
      throw new DomainException('unauthorized', INVALID_CREDENTIALS_MESSAGE);
    }

    // Checked after the password, so a wrong password reveals nothing about the account.
    if (!account.actif) {
      throw new DomainException('forbidden', 'Ce compte est désactivé. Contacte le super admin.');
    }

    const signedIn = await this.accounts.update(account.id, {
      echecsConnexion: 0,
      bloqueJusqua: null,
      derniereConnexion: now,
    });
    const token = this.tokens.issue(account.id, ADMIN_TOKEN_TTL_SECONDS);
    return { accessToken: token.token, expiresInSeconds: token.expiresInSeconds, administrateur: toAdministrateur(signedIn) };
  }

  private locked(now: Date, until: Date): DomainException {
    const retryInSeconds = secondsUntil(now, until);
    return new DomainException(
      'too_many_requests',
      `Trop d'essais. Réessaie dans ${Math.ceil(retryInSeconds / 60)} min.`,
      { retryInSeconds },
    );
  }
}
