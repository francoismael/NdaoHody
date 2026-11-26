import type { Position } from '@contract';

/** Last known position of each driver (table position_chauffeur). */
export abstract class DriverPositionRepository {
  abstract save(chauffeurId: number, trajetId: number | null, position: Position, enLigne: boolean, at: Date): Promise<void>;
}
