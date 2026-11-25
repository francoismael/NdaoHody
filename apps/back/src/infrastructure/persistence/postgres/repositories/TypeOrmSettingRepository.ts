import { Injectable } from '@nestjs/common';
import { SettingRepository } from '../../../../domain/repository/SettingRepository';
import { SettingEntity } from '../entities/SettingEntity';
import { TransactionContext } from '../TransactionContext';

@Injectable()
export class TypeOrmSettingRepository extends SettingRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  async findNumber(cle: string): Promise<number | null> {
    const setting = await this.context.repository(SettingEntity).findOneBy({ cle });
    const value = setting ? Number(setting.valeur) : Number.NaN;
    return Number.isFinite(value) ? value : null;
  }
}
