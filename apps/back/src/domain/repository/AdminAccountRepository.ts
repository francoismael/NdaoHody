import type { AdminAccount, AdminAccountChanges, NewAdminAccount } from '../entity/AdminAccount';

export abstract class AdminAccountRepository {
  abstract findById(id: number): Promise<AdminAccount | null>;

  abstract findByEmail(email: string): Promise<AdminAccount | null>;

  /** Every account, newest first. */
  abstract list(): Promise<AdminAccount[]>;

  abstract create(account: NewAdminAccount, dateCreation: Date): Promise<AdminAccount>;

  abstract update(id: number, changes: AdminAccountChanges): Promise<AdminAccount>;
}
