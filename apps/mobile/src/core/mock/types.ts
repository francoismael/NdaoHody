import type {
  AlerteSos,
  Avis,
  Conversation,
  DocumentChauffeur,
  LienSuivi,
  Notification,
  PositionChauffeur,
  Reservation,
  Trajet,
  Utilisateur,
  Vehicule,
} from '@contract';

export type Sequence =
  | 'utilisateur'
  | 'document'
  | 'vehicule'
  | 'trajet'
  | 'reservation'
  | 'conversation'
  | 'message'
  | 'avis'
  | 'notification'
  | 'sos'
  | 'lienSuivi';

/** The simulated server's database. Saved on the device after every write. */
export interface MockDb {
  version: number;
  seededAt: string;
  utilisateurs: Utilisateur[];
  documents: DocumentChauffeur[];
  vehicules: Vehicule[];
  trajets: Trajet[];
  positions: PositionChauffeur[];
  reservations: Reservation[];
  conversations: Conversation[];
  avis: Avis[];
  notifications: Notification[];
  alertesSos: AlerteSos[];
  liensSuivi: LienSuivi[];
  /** GAP #3 (sent to the backend): the contract has no field for the refusal reason. */
  motifsRefus: Record<number, string>;
  sequences: Record<Sequence, number>;
}

export const DB_VERSION = 1;

export const nextId = (db: MockDb, sequence: Sequence): number => {
  const id = db.sequences[sequence];
  db.sequences[sequence] = id + 1;
  return id;
};
