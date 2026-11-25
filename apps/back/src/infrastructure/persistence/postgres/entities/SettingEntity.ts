import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Table parametre. */
@Entity('parametre')
export class SettingEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  cle!: string;

  @Column({ type: 'varchar', length: 255 })
  valeur!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;
}
