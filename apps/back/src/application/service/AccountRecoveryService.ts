import { Injectable } from '@nestjs/common';
import { deletedPhoneNumber, type User } from '../../domain/entity/User';
import { UserSessionRepository } from '../../domain/repository/UserSessionRepository';
import { UserRepository } from '../../domain/repository/UserRepository';
import { toMeResponse, type MeResponse } from '../dto/MeResponse';
import { Clock } from '../port/Clock';
import { SessionIssuerService, type IssuedSession } from './SessionIssuerService';

/** Sent to the app when it must switch to the old account (its tokens replace the current ones). */
export interface ReactivatedAccount {
  message: string;
  utilisateur: MeResponse;
  session: IssuedSession;
}

export const REACTIVATED_ACCOUNT_MESSAGE =
  'Ce permis ou ce véhicule appartient à ton ancien compte Ndaohody : il a été réactivé avec son historique.';

/**
 * A driver deleted their account, then signed up again (often with a new SIM card)
 * and gave the same licence or plate: the OLD account is reactivated, so its history
 * and what it still owes come back. The account just created is closed.
 *
 * Must run inside UnitOfWork.run() together with the write that revealed the old account.
 */
@Injectable()
export class AccountRecoveryService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: UserSessionRepository,
    private readonly issuer: SessionIssuerService,
    private readonly clock: Clock,
  ) {}

  async recover(current: User, previous: User): Promise<ReactivatedAccount> {
    const now = this.clock.now();

    // Free the phone number first: telephone is unique.
    await this.users.update(current.id, { statut: 'supprime', telephone: deletedPhoneNumber(current.id) });
    await this.sessions.revokeAllForUser(current.id, now);

    // Name, sex, rating, trips and debts stay those of the old account.
    // Its driver application must be checked again.
    const reactivated = await this.users.update(previous.id, {
      statut: 'actif',
      telephone: current.telephone,
      modeActuel: 'chauffeur',
      statutChauffeur: previous.statutChauffeur === 'valide' ? 'en_attente' : previous.statutChauffeur,
    });
    const session = await this.issuer.issue(reactivated.id);

    return { message: REACTIVATED_ACCOUNT_MESSAGE, utilisateur: toMeResponse(reactivated), session };
  }
}
