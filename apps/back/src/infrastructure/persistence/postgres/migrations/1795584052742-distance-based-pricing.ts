import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Distance-based pricing.
 *
 * Before: the driver set one price per seat on the trip, capped by distance tiers (palier_prix).
 * Now: each passenger pays for their own segment (pickup -> drop-off) with a rate per vehicle type:
 *   seat price = max(prix_minimum, km x prix_par_km), rounded up to the next "arrondi" (100 Ar)
 *   car: 300 Ar/km, at least 3 000 Ar · motorbike: 500 Ar/km, at least 5 000 Ar
 *   total = seat price x seats
 * The price is computed by the server when the booking is requested, then frozen on the booking.
 */
export class DistanceBasedPricing1795584052742 implements MigrationInterface {
  name = 'DistanceBasedPricing1795584052742';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tarif (
        type_vehicule VARCHAR(10) PRIMARY KEY,
        prix_minimum INT NOT NULL,
        prix_par_km INT NOT NULL,
        arrondi INT NOT NULL DEFAULT 100,
        CONSTRAINT ck_tarif_type CHECK (type_vehicule IN ('moto', 'voiture')),
        CONSTRAINT ck_tarif_montants CHECK (prix_minimum > 0 AND prix_par_km > 0 AND arrondi > 0)
      );

      -- Reference data the app cannot work without (also in production).
      INSERT INTO tarif (type_vehicule, prix_minimum, prix_par_km, arrondi) VALUES
        ('voiture', 3000, 300, 100),
        ('moto', 5000, 500, 100);

      DROP TABLE palier_prix;
      DELETE FROM parametre WHERE cle = 'prix_max_par_place';
      ALTER TABLE trajet DROP COLUMN prix_par_place;

      ALTER TABLE reservation ADD COLUMN distance_metres INT, ADD COLUMN prix_par_place INT;
    `);

    // Existing bookings: distance along the driver's route between pickup and drop-off, then the new price.
    await queryRunner.query(`
      UPDATE reservation r
      SET distance_metres = GREATEST(1, round(ST_Length(ST_LineSubstring(
            t.chemin_geo::geometry,
            LEAST(ST_LineLocatePoint(t.chemin_geo::geometry, r.prise_en_charge_geo::geometry),
                  ST_LineLocatePoint(t.chemin_geo::geometry, r.depose_geo::geometry)),
            GREATEST(ST_LineLocatePoint(t.chemin_geo::geometry, r.prise_en_charge_geo::geometry),
                     ST_LineLocatePoint(t.chemin_geo::geometry, r.depose_geo::geometry))
          )::geography)))
      FROM trajet t
      WHERE t.id = r.trajet_id;

      UPDATE reservation r
      SET prix_par_place = GREATEST(ta.prix_minimum,
            ceil(r.distance_metres / 1000.0 * ta.prix_par_km / ta.arrondi)::int * ta.arrondi)
      FROM trajet t
      JOIN vehicule v ON v.id = t.vehicule_id
      JOIN tarif ta ON ta.type_vehicule = v.type
      WHERE t.id = r.trajet_id;

      UPDATE reservation SET prix_total = prix_par_place * places;

      ALTER TABLE reservation
        ALTER COLUMN distance_metres SET NOT NULL,
        ALTER COLUMN prix_par_place SET NOT NULL,
        ADD CONSTRAINT ck_reservation_prix
          CHECK (distance_metres > 0 AND prix_par_place > 0 AND prix_total = prix_par_place * places);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reservation
        DROP CONSTRAINT ck_reservation_prix,
        DROP COLUMN prix_par_place,
        DROP COLUMN distance_metres;

      ALTER TABLE trajet ADD COLUMN prix_par_place INT NOT NULL DEFAULT 3000;
      ALTER TABLE trajet ALTER COLUMN prix_par_place DROP DEFAULT;

      CREATE TABLE palier_prix (
        id SERIAL PRIMARY KEY,
        km_max DECIMAL(5,1),
        prix_max INT NOT NULL
      );

      DROP TABLE tarif;
    `);
  }
}
