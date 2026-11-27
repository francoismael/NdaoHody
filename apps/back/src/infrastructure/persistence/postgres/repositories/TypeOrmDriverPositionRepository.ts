import { Injectable } from '@nestjs/common';
import type { Position, PositionChauffeur } from '@contract';
import { DriverPositionRepository } from '../../../../domain/repository/DriverPositionRepository';
import { TransactionContext } from '../TransactionContext';

interface PositionRow {
  chauffeur_id: string;
  trajet_id: string | null;
  latitude: string;
  longitude: string;
  en_ligne: boolean;
  date_mise_a_jour: Date;
}

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

  async findByDriver(chauffeurId: number): Promise<PositionChauffeur | null> {
    const rows: PositionRow[] = await this.context.manager().query(
      `SELECT chauffeur_id, trajet_id, latitude, longitude, en_ligne, date_mise_a_jour
       FROM position_chauffeur WHERE chauffeur_id = $1`,
      [chauffeurId],
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      chauffeurId: Number(row.chauffeur_id),
      trajetId: row.trajet_id === null ? null : Number(row.trajet_id),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      enLigne: row.en_ligne,
      dateMiseAJour: new Date(row.date_mise_a_jour).toISOString(),
    };
  }

  async markStaleOffline(before: Date): Promise<number[]> {
    const rows: { chauffeur_id: string }[] = await this.context.manager().query(
      `UPDATE position_chauffeur SET en_ligne = FALSE
       WHERE en_ligne AND date_mise_a_jour < $1
       RETURNING chauffeur_id`,
      [before],
    );
    return rows.map((row) => Number(row.chauffeur_id));
  }
}
