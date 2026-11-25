import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../transformers';

/** Table journal_admin. */
@Entity('journal_admin')
export class AdminJournalEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'administrateur_id', type: 'bigint', transformer: numericTransformer })
  administrateurId!: number;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ name: 'cible_type', type: 'varchar', length: 50, nullable: true })
  cibleType!: string | null;

  @Column({ name: 'cible_id', type: 'bigint', nullable: true, transformer: numericTransformer })
  cibleId!: number | null;

  @Column({ type: 'text', nullable: true })
  details!: string | null;

  @Column({ name: 'date_action', type: 'timestamptz' })
  dateAction!: Date;
}
