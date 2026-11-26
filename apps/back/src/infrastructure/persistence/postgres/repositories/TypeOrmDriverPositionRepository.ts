import { Injectable } from '@nestjs/common';
import type { Position } from '@contract';
import { DriverPositionRepository } from '../../../../domain/repository/DriverPositionRepository';
import { TransactionContext } from '../TransactionContext';

@Injectable()
export class TypeOrmDriverPositionRepository extends DriverPositionRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  /** One row per driver: replaced at every new position. */
  async save(chauffeurId: number, trajetId: number | null, position: Position, enLigne: boolean, at: Date): Promise<void> {
    await this.context.manager().query(
      `INSERT INTO position_chauffeur (chauffeur_id, trajet_id, latitude, longitude, en_ligne, date_mise_a_jour)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (chauffeur_id) DO UPDATE SET
         trajet_id = EXCLUDED.trajet_id, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
         en_ligne = EXCLUDED.en_ligne, date_mise_a_jour = EXCLUDED.date_mise_a_jour`,
      [chauffeurId, trajetId, position.latitude, position.longitude, enLigne, at],
    );
  }
}
