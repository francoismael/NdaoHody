import type { StatutVehicule, TypeVehicule } from '@contract';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { Vehicle } from '../../../../domain/entity/Vehicle';
import { numericTransformer } from '../transformers';

/** Table vehicule. Property names are the fields of the data object Vehicule. */
@Entity('vehicule')
export class VehicleEntity implements Vehicle {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'utilisateur_id', type: 'bigint', transformer: numericTransformer })
  utilisateurId!: number;

  @Column({ type: 'varchar', length: 10 })
  type!: TypeVehicule;

  @Column({ type: 'varchar', length: 50, nullable: true })
  marque!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modele!: string | null;

  @Column({ type: 'varchar', length: 30 })
  couleur!: string;

  @Column({ type: 'varchar', length: 20 })
  immatriculation!: string;

  @Column({ type: 'int' })
  places!: number;

  @Column({ name: 'photo_url', type: 'varchar', length: 255 })
  photoUrl!: string;

  @Column({ name: 'par_defaut', type: 'boolean' })
  parDefaut!: boolean;

  @Column({ type: 'varchar', length: 20 })
  statut!: StatutVehicule;

  @Column({ name: 'motif_refus', type: 'varchar', length: 255, nullable: true })
  motifRefus!: string | null;
}
