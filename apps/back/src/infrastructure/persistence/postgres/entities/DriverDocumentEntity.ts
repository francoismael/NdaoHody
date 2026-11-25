import type { StatutValidation, TypeDocument } from '@contract';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { DriverDocument } from '../../../../domain/entity/DriverDocument';
import { numericTransformer } from '../transformers';

/** Table document_chauffeur. */
@Entity('document_chauffeur')
export class DriverDocumentEntity implements DriverDocument {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'utilisateur_id', type: 'bigint', transformer: numericTransformer })
  utilisateurId!: number;

  @Column({ type: 'varchar', length: 20 })
  type!: TypeDocument;

  /** Key of the private file, not a URL. */
  @Column({ name: 'fichier_url', type: 'varchar', length: 255 })
  fichierUrl!: string;

  @Column({ type: 'varchar', length: 20 })
  statut!: StatutValidation;

  @Column({ name: 'motif_refus', type: 'varchar', length: 255, nullable: true })
  motifRefus!: string | null;

  @Column({ name: 'verifie_par', type: 'bigint', nullable: true, transformer: numericTransformer })
  verifiePar!: number | null;

  @Column({ name: 'date_envoi', type: 'timestamptz' })
  dateEnvoi!: Date;
}
