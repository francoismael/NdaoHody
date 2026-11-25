import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../application/port/UnitOfWork';
import { TransactionContext } from '../persistence/postgres/TransactionContext';

/** BEGIN, then COMMIT when `work` resolves, ROLLBACK when it throws. */
@Injectable()
export class TypeOrmUnitOfWorkAdapter extends UnitOfWork {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.context.run(work);
  }
}
