import { Injectable } from '@nestjs/common';
import { ConversationRepository } from '../../../../domain/repository/ConversationRepository';
import { TransactionContext } from '../TransactionContext';

@Injectable()
export class TypeOrmConversationRepository extends ConversationRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  /** One conversation per booking (reservation_id is unique): nothing happens the second time. */
  async openFor(reservationId: number): Promise<void> {
    await this.context
      .manager()
      .query(`INSERT INTO conversation (reservation_id) VALUES ($1) ON CONFLICT (reservation_id) DO NOTHING`, [reservationId]);
  }
}
