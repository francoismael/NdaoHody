import { Injectable } from '@nestjs/common';
import type { CanalOtp } from '@contract';
import { IsNull, MoreThanOrEqual } from 'typeorm';
import type { NewOtpCode, OtpCode } from '../../../../domain/entity/OtpCode';
import { OtpCodeRepository } from '../../../../domain/repository/OtpCodeRepository';
import { OtpCodeEntity } from '../entities/OtpCodeEntity';
import { TransactionContext } from '../TransactionContext';

const NEWEST_FIRST = { dateCreation: 'DESC', id: 'DESC' } as const;

@Injectable()
export class TypeOrmOtpCodeRepository extends OtpCodeRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  findLatest(telephone: string): Promise<OtpCode | null> {
    return this.context.repository(OtpCodeEntity).findOne({ where: { telephone }, order: NEWEST_FIRST });
  }

  findLatestByChannel(telephone: string, canal: CanalOtp): Promise<OtpCode | null> {
    return this.context.repository(OtpCodeEntity).findOne({ where: { telephone, canal }, order: NEWEST_FIRST });
  }

  findByWhatsAppMessageId(whatsappMessageId: string): Promise<OtpCode | null> {
    return this.context.repository(OtpCodeEntity).findOneBy({ whatsappMessageId });
  }

  countCreatedSince(telephone: string, since: Date): Promise<number> {
    return this.context.repository(OtpCodeEntity).countBy({ telephone, dateCreation: MoreThanOrEqual(since) });
  }

  async create(code: NewOtpCode): Promise<OtpCode> {
    const repository = this.context.repository(OtpCodeEntity);
    return repository.save(
      repository.create({
        ...code,
        essais: 0,
        whatsappMessageId: null,
        dateUtilisation: null,
        dateAnnulation: null,
        dateEchecLivraison: null,
      }),
    );
  }

  async setWhatsAppMessageId(id: number, whatsappMessageId: string): Promise<void> {
    await this.context.repository(OtpCodeEntity).update({ id }, { whatsappMessageId });
  }

  async recordFailedAttempt(id: number): Promise<void> {
    await this.context.repository(OtpCodeEntity).increment({ id }, 'essais', 1);
  }

  async markUsed(id: number, at: Date): Promise<void> {
    await this.context.repository(OtpCodeEntity).update({ id }, { dateUtilisation: at });
  }

  // Conditional updates: two copies of the same Meta status arriving together change the row only once.
  async recordDeliveryFailure(id: number, at: Date): Promise<boolean> {
    const result = await this.context
      .repository(OtpCodeEntity)
      .update({ id, dateEchecLivraison: IsNull() }, { dateEchecLivraison: at });
    return (result.affected ?? 0) > 0;
  }

  async cancel(id: number, at: Date): Promise<boolean> {
    const result = await this.context
      .repository(OtpCodeEntity)
      .update({ id, dateAnnulation: IsNull(), dateUtilisation: IsNull() }, { dateAnnulation: at });
    return (result.affected ?? 0) > 0;
  }
}
