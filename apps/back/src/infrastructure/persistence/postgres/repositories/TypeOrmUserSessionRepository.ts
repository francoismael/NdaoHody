import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import type { NewUserSession, UserSession } from '../../../../domain/entity/UserSession';
import { UserSessionRepository } from '../../../../domain/repository/UserSessionRepository';
import { UserSessionEntity } from '../entities/UserSessionEntity';
import { TransactionContext } from '../TransactionContext';

@Injectable()
export class TypeOrmUserSessionRepository extends UserSessionRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  async create(session: NewUserSession): Promise<UserSession> {
    const repository = this.context.repository(UserSessionEntity);
    return repository.save(repository.create({ ...session, dateRevocation: null }));
  }

  findByTokenHash(jetonHash: string): Promise<UserSession | null> {
    return this.context.repository(UserSessionEntity).findOneBy({ jetonHash });
  }

  async revoke(id: number, at: Date): Promise<void> {
    await this.context.repository(UserSessionEntity).update({ id, dateRevocation: IsNull() }, { dateRevocation: at });
  }

  async revokeAllForUser(utilisateurId: number, at: Date): Promise<void> {
    await this.context
      .repository(UserSessionEntity)
      .update({ utilisateurId, dateRevocation: IsNull() }, { dateRevocation: at });
  }
}
