import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm';

/**
 * Shares the current transaction with every repository, without passing it as a parameter.
 * Inside UnitOfWork.run(), repositories write through the transaction; outside, they use the pool.
 */
@Injectable()
export class TransactionContext {
  private readonly storage = new AsyncLocalStorage<EntityManager>();

  constructor(private readonly dataSource: DataSource) {}

  manager(): EntityManager {
    return this.storage.getStore() ?? this.dataSource.manager;
  }

  repository<Entity extends ObjectLiteral>(entity: EntityTarget<Entity>): Repository<Entity> {
    return this.manager().getRepository(entity);
  }

  /**
   * Raw UPDATE / DELETE ... RETURNING. For these commands, TypeORM's Postgres driver answers
   * [rows, affected count] instead of the rows alone: this returns the rows.
   */
  async queryReturning<Row>(sql: string, parameters: readonly unknown[]): Promise<Row[]> {
    const result: unknown = await this.manager().query(sql, [...parameters]);
    const rows: unknown = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    return Array.isArray(rows) ? (rows as Row[]) : [];
  }

  /** Nested calls join the transaction already open. */
  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.storage.getStore()) {
      return work();
    }
    return this.dataSource.transaction((manager) => this.storage.run(manager, work));
  }
}
