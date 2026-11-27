import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sign-in codes sent by WhatsApp, with an automatic fallback to SMS:
 * the channel of each code, the WhatsApp message it went with, and when it was cancelled
 * (replaced by an SMS code) or could not be delivered.
 */
export class WhatsAppOtp1795788968602 implements MigrationInterface {
  name = 'WhatsAppOtp1795788968602';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE code_otp
        ADD COLUMN canal VARCHAR(10) NOT NULL DEFAULT 'sms',
        ADD COLUMN whatsapp_message_id VARCHAR(100),
        ADD COLUMN date_annulation TIMESTAMPTZ,
        ADD COLUMN date_echec_livraison TIMESTAMPTZ,
        ADD CONSTRAINT ck_code_otp_canal CHECK (canal IN ('sms', 'whatsapp'));
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX ux_code_otp_whatsapp_message_id ON code_otp (whatsapp_message_id)
      WHERE whatsapp_message_id IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX idx_code_otp_telephone_canal ON code_otp (telephone, canal, date_creation DESC);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_code_otp_telephone_canal;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_code_otp_whatsapp_message_id;`);
    await queryRunner.query(`
      ALTER TABLE code_otp
        DROP CONSTRAINT IF EXISTS ck_code_otp_canal,
        DROP COLUMN IF EXISTS date_echec_livraison,
        DROP COLUMN IF EXISTS date_annulation,
        DROP COLUMN IF EXISTS whatsapp_message_id,
        DROP COLUMN IF EXISTS canal;
    `);
  }
}
