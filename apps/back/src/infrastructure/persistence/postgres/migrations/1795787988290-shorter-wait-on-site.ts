import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The driver on site waits 10 minutes for his passenger instead of 15 (15 was too long).
 * Only the default value is changed: a value already set by the super admin is kept.
 */
export class ShorterWaitOnSite1795787988290 implements MigrationInterface {
  name = 'ShorterWaitOnSite1795787988290';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE parametre SET valeur = '10', description = 'Compte à rebours de 10 min quand le chauffeur est sur place'
      WHERE cle = 'attente_minutes' AND valeur = '15';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE parametre SET valeur = '15', description = 'Compte à rebours quand le chauffeur est sur place'
      WHERE cle = 'attente_minutes' AND valeur = '10';
    `);
  }
}
