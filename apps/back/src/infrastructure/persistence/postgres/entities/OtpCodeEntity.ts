import type { CanalOtp } from '@contract';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { OtpCode } from '../../../../domain/entity/OtpCode';

/** Table code_otp. */
@Entity('code_otp')
export class OtpCodeEntity implements OtpCode {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  telephone!: string;

  @Column({ name: 'code_hash', type: 'varchar', length: 255 })
  codeHash!: string;

  @Column({ type: 'int' })
  essais!: number;

  @Column({ type: 'varchar', length: 10 })
  canal!: CanalOtp;

  @Column({ name: 'whatsapp_message_id', type: 'varchar', length: 100, nullable: true })
  whatsappMessageId!: string | null;

  @Column({ name: 'date_expiration', type: 'timestamptz' })
  dateExpiration!: Date;

  @Column({ name: 'date_utilisation', type: 'timestamptz', nullable: true })
  dateUtilisation!: Date | null;

  @Column({ name: 'date_annulation', type: 'timestamptz', nullable: true })
  dateAnnulation!: Date | null;

  @Column({ name: 'date_echec_livraison', type: 'timestamptz', nullable: true })
  dateEchecLivraison!: Date | null;

  @Column({ name: 'date_creation', type: 'timestamptz' })
  dateCreation!: Date;
}
