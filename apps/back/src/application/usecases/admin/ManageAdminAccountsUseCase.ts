import { Injectable } from '@nestjs/common';
import type { Administrateur } from '@contract';
import {
  CREATABLE_ROLES,
  normalizeEmail,
  toAdministrateur,
  type AdminAccount,
} from '../../../domain/entity/AdminAccount';
import { DomainException } from '../../../domain/exception/DomainException';
import { AdminAccountRepository } from '../../../domain/repository/AdminAccountRepository';
import type { CreateAdminAccountRequest } from '../../dto/AdminRequests';
import type { AdminAccountWithPasswordResponse } from '../../dto/AdminResponses';
import { Clock } from '../../port/Clock';
import { PasswordHasher } from '../../port/PasswordHasher';
import { RandomGenerator } from '../../port/RandomGenerator';

const ACCOUNT_NOT_FOUND_MESSAGE = 'Compte introuvable.';

/**
 * Super admin only (checked by the route): admin and investisseur accounts.
 * Super admin accounts are created with the create-super-admin command, never from here.
 */
@Injectable()
export class ManageAdminAccountsUseCase {
  constructor(
    private readonly accounts: AdminAccountRepository,
    private readonly passwords: PasswordHasher,
    private readonly random: RandomGenerator,
    private readonly clock: Clock,
  ) {}

  async list(): Promise<Administrateur[]> {
    return (await this.accounts.list()).map(toAdministrateur);
  }

  async create(actor: AdminAccount, request: CreateAdminAccountRequest): Promise<AdminAccountWithPasswordResponse> {
    if (!CREATABLE_ROLES.includes(request.role)) {
      throw new DomainException('forbidden', 'Ce rôle ne peut pas être créé depuis le back-office.');
    }
    const email = normalizeEmail(request.email);
    if (await this.accounts.findByEmail(email)) {
      throw new DomainException('conflict', 'Un compte existe déjà avec cet e-mail.');
    }

    const motDePasseTemporaire = this.random.password();
    const account = await this.accounts.create(
      {
        nomComplet: request.nomComplet,
        email,
        motDePasse: await this.passwords.hash(motDePasseTemporaire),
        role: request.role,
        creePar: actor.id,
      },
      this.clock.now(),
    );
    return { administrateur: toAdministrateur(account), motDePasseTemporaire };
  }

  async setActive(accountId: number, actif: boolean): Promise<Administrateur> {
    const account = await this.findManageable(accountId);
    return toAdministrateur(await this.accounts.update(account.id, { actif }));
  }

  /** New temporary password; also unlocks the account. */
  async resetPassword(accountId: number): Promise<AdminAccountWithPasswordResponse> {
    const account = await this.findManageable(accountId);
    const motDePasseTemporaire = this.random.password();
    const updated = await this.accounts.update(account.id, {
      motDePasse: await this.passwords.hash(motDePasseTemporaire),
      echecsConnexion: 0,
      bloqueJusqua: null,
    });
    return { administrateur: toAdministrateur(updated), motDePasseTemporaire };
  }

  private async findManageable(accountId: number): Promise<AdminAccount> {
    const account = await this.accounts.findById(accountId);
    if (!account) {
      throw new DomainException('not_found', ACCOUNT_NOT_FOUND_MESSAGE);
    }
    if (account.role === 'super_admin') {
      throw new DomainException('forbidden', 'Un compte super admin ne se gère pas depuis le back-office.');
    }
    return account;
  }
}
