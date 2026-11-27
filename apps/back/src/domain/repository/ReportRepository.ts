/** Reports about users (table signalement). */
export abstract class ReportRepository {
  /** Reports about this user that an admin confirmed (status "traite"). */
  abstract countConfirmedAgainst(cibleId: number): Promise<number>;
}
