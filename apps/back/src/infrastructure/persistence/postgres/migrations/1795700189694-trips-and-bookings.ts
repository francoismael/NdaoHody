import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Publishing, searching and booking trips (steps 6 to 8).
 * - reservation.motif_refus: reason given by the driver when he refuses a request (shown to the passenger).
 * - parametre trajet_max_jours_avance: a trip can be published at most 15 days ahead.
 */
export class TripsAndBookings1795700189694 implements MigrationInterface {
  name = 'TripsAndBookings1795700189694';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reservation ADD COLUMN motif_refus VARCHAR(255);

      INSERT INTO parametre (cle, valeur, description) VALUES
        ('trajet_max_jours_avance', '15', 'Un trajet se publie au plus 15 jours à l''avance')
      ON CONFLICT (cle) DO NOTHING;

      CREATE INDEX idx_trajet_depart_publie ON trajet (date_depart) WHERE statut = 'publie';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_trajet_depart_publie;
      DELETE FROM parametre WHERE cle = 'trajet_max_jours_avance';
      ALTER TABLE reservation DROP COLUMN motif_refus;
    `);
  }
}
