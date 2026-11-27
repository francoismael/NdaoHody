import { Injectable } from '@nestjs/common';
import { ReportRepository } from '../../../../domain/repository/ReportRepository';
import { TransactionContext } from '../TransactionContext';

@Injectable()
export class TypeOrmReportRepository extends ReportRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  async countConfirmedAgainst(cibleId: number): Promise<number> {
    const rows: { total: string }[] = await this.context
      .manager()
      .query(`SELECT count(*) AS total FROM signalement WHERE cible_id = $1 AND statut = 'traite'`, [cibleId]);
    return Number(rows[0]?.total ?? 0);
  }
}
