import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { UserSession } from '../../../../domain/entity/UserSession';
import { numericTransformer } from '../transformers';

/** Table session_utilisateur. */
@Entity('session_utilisateur')
export class UserSessionEntity implements UserSession {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'utilisateur_id', type: 'bigint', transformer: numericTransformer })
  utilisateurId!: number;

  @Column({ name: 'jeton_hash', type: 'varchar', length: 64 })
  jetonHash!: string;

  @Column({ name: 'date_expiration', type: 'timestamptz' })
  dateExpiration!: Date;

  @Column({ name: 'date_revocation', type: 'timestamptz', nullable: true })
  dateRevocation!: Date | null;

  @Column({ name: 'date_creation', type: 'timestamptz' })
  dateCreation!: Date;
}
