import type { TypeVehicule } from '@contract';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Table tarif: rates per vehicle type, changed by the super admin. */
@Entity('tarif')
export class TariffEntity {
  @PrimaryColumn({ name: 'type_vehicule', type: 'varchar', length: 10 })
  typeVehicule!: TypeVehicule;

  @Column({ name: 'prix_minimum', type: 'int' })
  prixMinimum!: number;

  @Column({ name: 'prix_par_km', type: 'int' })
  prixParKm!: number;

  @Column({ type: 'int' })
  arrondi!: number;
}
