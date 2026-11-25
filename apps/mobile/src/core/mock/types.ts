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
  /** Simulated driving, by trip id (demo only: the real app sends GPS positions). */
  drives: Record<number, Drive>;
  /** GAP #3 (sent to the backend): the contract has no field for the refusal reason. */
  motifsRefus: Record<number, string>;
  sequences: Record<Sequence, number>;
}

/** Where a simulated car is on its path, as a function of time. */
export interface Drive {
  anchorAt: string;
  anchorMetres: number;
  /** The car waits here (next pickup or drop, or the end of the path). */
  capMetres: number;
  /** Reservations whose pickup the car has already come within 500 m of (recorded once). */
  nearPickup: number[];
}

/** 2 (R3): adds `drives`. A stored database with an older version is seeded again. */
export const DB_VERSION = 2;

export const nextId = (db: MockDb, sequence: Sequence): number => {
  const id = db.sequences[sequence];
  db.sequences[sequence] = id + 1;
  return id;
};
