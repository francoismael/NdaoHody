import { Injectable } from '@nestjs/common';
import type { AdminAccount, AdminAccountChanges, NewAdminAccount } from '../../../../domain/entity/AdminAccount';
import { AdminAccountRepository } from '../../../../domain/repository/AdminAccountRepository';
import { AdminAccountEntity, toAdminAccount } from '../entities/AdminAccountEntity';
import { TransactionContext } from '../TransactionContext';

@Injectable()
export class TypeOrmAdminAccountRepository extends AdminAccountRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  async findById(id: number): Promise<AdminAccount | null> {
    const entity = await this.context.repository(AdminAccountEntity).findOneBy({ id });
    return entity ? toAdminAccount(entity) : null;
  }

  async findByEmail(email: string): Promise<AdminAccount | null> {
    const entity = await this.context.repository(AdminAccountEntity).findOneBy({ email });
    return entity ? toAdminAccount(entity) : null;
  }

  async list(): Promise<AdminAccount[]> {
    const entities = await this.context.repository(AdminAccountEntity).find({ order: { dateCreation: 'DESC' } });
    return entities.map(toAdminAccount);
  }

  async create(account: NewAdminAccount, dateCreation: Date): Promise<AdminAccount> {
    const repository = this.context.repository(AdminAccountEntity);
    const saved = await repository.save(
      repository.create({ ...account, actif: true, echecsConnexion: 0, bloqueJusqua: null, derniereConnexion: null, dateCreation }),
    );
    return toAdminAccount(saved);
  }

  async update(id: number, changes: AdminAccountChanges): Promise<AdminAccount> {
    const repository = this.context.repository(AdminAccountEntity);
    await repository.update({ id }, changes);
    return toAdminAccount(await repository.findOneByOrFail({ id }));
  }
}
