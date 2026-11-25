/**
 * Port: runs several writes as one database transaction.
 * Either every write inside `work` is saved, or none is (rollback when `work` throws).
 */
export abstract class UnitOfWork {
  abstract run<T>(work: () => Promise<T>): Promise<T>;
}
