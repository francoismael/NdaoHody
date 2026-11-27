import type { Position, PositionChauffeur } from '@contract';

/** Last known position of each driver (table position_chauffeur). */
export abstract class DriverPositionRepository {
  abstract save(chauffeurId: number, trajetId: number | null, position: Position, enLigne: boolean, at: Date): Promise<void>;

  abstract findByDriver(chauffeurId: number): Promise<PositionChauffeur | null>;

  /** Drivers still "online" whose last position is older than `before` go offline; returns their ids. */
  abstract markStaleOffline(before: Date): Promise<number[]>;
}
