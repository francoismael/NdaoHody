import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sessions of the native app: one row per signed-in phone.
 * Holds the hash of the refresh token (30 days), so a session can be closed
 * on sign-out, when the token is refreshed (rotation) and when the account is suspended or deleted.
 */
export class UserSessions1795586605794 implements MigrationInterface {
  name = 'UserSessions1795586605794';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE session_utilisateur (
        id SERIAL PRIMARY KEY,
        utilisateur_id BIGINT NOT NULL,
        jeton_hash VARCHAR(64) NOT NULL UNIQUE,
        date_expiration TIMESTAMPTZ NOT NULL,
        date_revocation TIMESTAMPTZ,
        date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_session_utilisateur
          FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_session_utilisateur_active
        ON session_utilisateur (utilisateur_id) WHERE date_revocation IS NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE session_utilisateur`);
  }
}
