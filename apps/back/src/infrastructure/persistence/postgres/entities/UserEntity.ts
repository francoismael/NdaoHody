import type { Badge, Mode, Sexe, StatutChauffeur, StatutCompte } from '@contract';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { User } from '../../../../domain/entity/User';
import { numericTransformer } from '../transformers';

/** Table utilisateur. Property names are the fields of the data object Utilisateur (plus numeroPermis). */
@Entity('utilisateur')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  telephone!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nom!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  prenom!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  sexe!: Sexe | null;

  @Column({ name: 'photo_url', type: 'varchar', length: 255, nullable: true })
  photoUrl!: string | null;

  @Column({ name: 'mode_actuel', type: 'varchar', length: 10 })
  modeActuel!: Mode;

  @Column({ name: 'statut_chauffeur', type: 'varchar', length: 20 })
  statutChauffeur!: StatutChauffeur;

  @Column({ type: 'varchar', length: 20 })
  statut!: StatutCompte;

  @Column({ type: 'varchar', length: 20 })
  badge!: Badge;

  @Column({ name: 'note_moyenne', type: 'decimal', precision: 2, scale: 1, nullable: true, transformer: numericTransformer })
  noteMoyenne!: number | null;

  @Column({ name: 'nombre_notes', type: 'int' })
  nombreNotes!: number;

  @Column({ name: 'courses_passager', type: 'int' })
  coursesPassager!: number;

  @Column({ name: 'courses_chauffeur', type: 'int' })
  coursesChauffeur!: number;

  @Column({ type: 'int' })
  absences!: number;

  @Column({ name: 'telephone_verifie', type: 'boolean' })
  telephoneVerifie!: boolean;

  @Column({ name: 'numero_permis', type: 'varchar', length: 30, nullable: true })
  numeroPermis!: string | null;

  @Column({ name: 'date_creation', type: 'timestamptz' })
  dateCreation!: Date;
}

export function toUser(entity: UserEntity): User {
  return { ...entity, dateCreation: entity.dateCreation.toISOString() };
}
