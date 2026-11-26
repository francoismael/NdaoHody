import { Injectable } from '@nestjs/common';
import { BlockRepository } from '../../../../domain/repository/BlockRepository';
import { TransactionContext } from '../TransactionContext';

@Injectable()
export class TypeOrmBlockRepository extends BlockRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  async areBlocked(userA: number, userB: number): Promise<boolean> {
    const rows: { bloque: boolean }[] = await this.context.manager().query(
      `SELECT EXISTS (
         SELECT 1 FROM blocage
         WHERE (utilisateur_id = $1 AND bloque_id = $2) OR (utilisateur_id = $2 AND bloque_id = $1)
       ) AS bloque`,
      [userA, userB],
    );
    return rows[0]?.bloque === true;
  }
}
