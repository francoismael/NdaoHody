import { Injectable } from '@nestjs/common';
import { AdminJournalEntry, AdminJournalRepository } from '../../../../domain/repository/AdminJournalRepository';
import { AdminJournalEntity } from '../entities/AdminJournalEntity';
import { TransactionContext } from '../TransactionContext';

@Injectable()
export class TypeOrmAdminJournalRepository extends AdminJournalRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  async add(entry: AdminJournalEntry): Promise<void> {
    await this.context.repository(AdminJournalEntity).insert(entry);
  }
}
