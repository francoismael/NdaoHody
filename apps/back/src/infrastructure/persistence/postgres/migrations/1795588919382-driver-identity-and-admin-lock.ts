import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Driver identity and back-office sign-in protection.
 *
 * - utilisateur.numero_permis: driving licence number typed by the driver and checked by an admin
 *   against the photo. Unique across ALL accounts, deleted ones included: a driver who deletes
 *   their account and signs up again with the same licence gets their old account back
 *   (with everything it still owes), instead of a fresh one.
 *   The plate (vehicule.immatriculation) is already unique across all accounts.
 * - administrateur.echecs_connexion / bloque_jusqua: the account is locked for 15 min after 5 wrong passwords.
 */
export class DriverIdentityAndAdminLock1795588919382 implements MigrationInterface {
  name = 'DriverIdentityAndAdminLock1795588919382';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE utilisateur ADD COLUMN numero_permis VARCHAR(30);
      CREATE UNIQUE INDEX uq_utilisateur_numero_permis ON utilisateur (numero_permis) WHERE numero_permis IS NOT NULL;

      ALTER TABLE administrateur
        ADD COLUMN echecs_connexion INT NOT NULL DEFAULT 0,
        ADD COLUMN bloque_jusqua TIMESTAMPTZ;

      CREATE INDEX idx_document_chauffeur_utilisateur ON document_chauffeur (utilisateur_id, type, date_envoi DESC);
      CREATE INDEX idx_vehicule_statut ON vehicule (statut);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_vehicule_statut;
      DROP INDEX idx_document_chauffeur_utilisateur;
      ALTER TABLE administrateur DROP COLUMN bloque_jusqua, DROP COLUMN echecs_connexion;
      DROP INDEX uq_utilisateur_numero_permis;
      ALTER TABLE utilisateur DROP COLUMN numero_permis;
    `);
  }
}
