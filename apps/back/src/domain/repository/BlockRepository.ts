/** Blocks between users (table blocage). */
export abstract class BlockRepository {
  /** true when one of the two blocked the other. */
  abstract areBlocked(userA: number, userB: number): Promise<boolean>;
}
