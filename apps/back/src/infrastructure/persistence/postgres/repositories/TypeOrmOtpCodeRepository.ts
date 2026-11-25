import { Injectable } from '@nestjs/common';
import { MoreThanOrEqual } from 'typeorm';
import type { NewOtpCode, OtpCode } from '../../../../domain/entity/OtpCode';
import { OtpCodeRepository } from '../../../../domain/repository/OtpCodeRepository';
import { OtpCodeEntity } from '../entities/OtpCodeEntity';
import { TransactionContext } from '../TransactionContext';

@Injectable()
export class TypeOrmOtpCodeRepository extends OtpCodeRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  findLatest(telephone: string): Promise<OtpCode | null> {
    return this.context.repository(OtpCodeEntity).findOne({
      where: { telephone },
      order: { dateCreation: 'DESC', id: 'DESC' },
    });
  }

  countCreatedSince(telephone: string, since: Date): Promise<number> {
    return this.context.repository(OtpCodeEntity).countBy({ telephone, dateCreation: MoreThanOrEqual(since) });
  }

  async create(code: NewOtpCode): Promise<OtpCode> {
    const repository = this.context.repository(OtpCodeEntity);
    return repository.save(repository.create({ ...code, essais: 0, dateUtilisation: null }));
  }

  async recordFailedAttempt(id: number): Promise<void> {
    await this.context.repository(OtpCodeEntity).increment({ id }, 'essais', 1);
  }

  async markUsed(id: number, at: Date): Promise<void> {
    await this.context.repository(OtpCodeEntity).update({ id }, { dateUtilisation: at });
  }
}
