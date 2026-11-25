import type { RoleAdmin } from '@contract';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { AdminAccount } from '../../../../domain/entity/AdminAccount';
import { numericTransformer } from '../transformers';

/** Table administrateur. */
@Entity('administrateur')
export class AdminAccountEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'nom_complet', type: 'varchar', length: 150 })
  nomComplet!: string;

  @Column({ type: 'varchar', length: 150 })
  email!: string;

  @Column({ name: 'mot_de_passe', type: 'varchar', length: 255 })
  motDePasse!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: RoleAdmin;

  @Column({ type: 'boolean' })
  actif!: boolean;

  @Column({ name: 'cree_par', type: 'bigint', nullable: true, transformer: numericTransformer })
  creePar!: number | null;

  @Column({ name: 'derniere_connexion', type: 'timestamptz', nullable: true })
  derniereConnexion!: Date | null;

  @Column({ name: 'echecs_connexion', type: 'int' })
  echecsConnexion!: number;

  @Column({ name: 'bloque_jusqua', type: 'timestamptz', nullable: true })
  bloqueJusqua!: Date | null;

  @Column({ name: 'date_creation', type: 'timestamptz' })
  dateCreation!: Date;
}

export function toAdminAccount(entity: AdminAccountEntity): AdminAccount {
  return {
    ...entity,
    derniereConnexion: entity.derniereConnexion?.toISOString() ?? null,
    dateCreation: entity.dateCreation.toISOString(),
  };
}
