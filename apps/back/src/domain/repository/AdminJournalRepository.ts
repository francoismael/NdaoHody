export interface AdminJournalEntry {
  administrateurId: number;
  /** e.g. "chauffeur.valider". */
  action: string;
  cibleType: string | null;
  cibleId: number | null;
  details: string | null;
  dateAction: Date;
}

/** Who did what in the back-office (table journal_admin). */
export abstract class AdminJournalRepository {
  abstract add(entry: AdminJournalEntry): Promise<void>;
}
