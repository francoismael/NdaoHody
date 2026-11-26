import type { Chemin, StatutTrajet, TypeTrajet } from '@contract';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { NewTrip, Trip, TripChanges } from '../../../../domain/entity/Trip';
import { numericTransformer } from '../transformers';

/** Table trajet. The geography columns (depart_geo, chemin_geo...) are computed by PostgreSQL. */
@Entity('trajet')
export class TripEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'chauffeur_id', type: 'bigint', transformer: numericTransformer })
  chauffeurId!: number;

  @Column({ name: 'vehicule_id', type: 'bigint', transformer: numericTransformer })
  vehiculeId!: number;

  @Column({ type: 'varchar', length: 20 })
  type!: TypeTrajet;

  @Column({ type: 'varchar', length: 20 })
  statut!: StatutTrajet;

  @Column({ name: 'depart_libelle', type: 'varchar', length: 150 })
  departLibelle!: string;

  @Column({ name: 'depart_latitude', type: 'decimal', precision: 10, scale: 7, transformer: numericTransformer })
  departLatitude!: number;

  @Column({ name: 'depart_longitude', type: 'decimal', precision: 10, scale: 7, transformer: numericTransformer })
  departLongitude!: number;

  @Column({ name: 'arrivee_libelle', type: 'varchar', length: 150 })
  arriveeLibelle!: string;

  @Column({ name: 'arrivee_latitude', type: 'decimal', precision: 10, scale: 7, transformer: numericTransformer })
  arriveeLatitude!: number;

  @Column({ name: 'arrivee_longitude', type: 'decimal', precision: 10, scale: 7, transformer: numericTransformer })
  arriveeLongitude!: number;

  @Column({ type: 'jsonb' })
  chemin!: Chemin;

  @Column({ name: 'distance_metres', type: 'int' })
  distanceMetres!: number;

  @Column({ name: 'duree_secondes', type: 'int' })
  dureeSecondes!: number;

  @Column({ name: 'date_depart', type: 'timestamptz' })
  dateDepart!: Date;

  @Column({ name: 'places_total', type: 'int' })
  placesTotal!: number;

  @Column({ name: 'places_libres', type: 'int' })
  placesLibres!: number;

  @Column({ name: 'date_annulation', type: 'timestamptz', nullable: true })
  dateAnnulation!: Date | null;

  @Column({ name: 'date_fin', type: 'timestamptz', nullable: true })
  dateFin!: Date | null;

  @Column({ name: 'reserve_femmes', type: 'boolean' })
  reserveFemmes!: boolean;
}

const iso = (date: Date | null): string | null => date?.toISOString() ?? null;
const date = (value: string | null | undefined): Date | null | undefined =>
  value === undefined ? undefined : value === null ? null : new Date(value);

export function toTrip(entity: TripEntity): Trip {
  return {
    id: entity.id,
    chauffeurId: entity.chauffeurId,
    vehiculeId: entity.vehiculeId,
    type: entity.type,
    statut: entity.statut,
    depart: { libelle: entity.departLibelle, latitude: entity.departLatitude, longitude: entity.departLongitude },
    arrivee: { libelle: entity.arriveeLibelle, latitude: entity.arriveeLatitude, longitude: entity.arriveeLongitude },
    chemin: entity.chemin,
    distanceMetres: entity.distanceMetres,
    dureeSecondes: entity.dureeSecondes,
    dateDepart: entity.dateDepart.toISOString(),
    placesTotal: entity.placesTotal,
    placesLibres: entity.placesLibres,
    dateAnnulation: iso(entity.dateAnnulation),
    dateFin: iso(entity.dateFin),
    reserveFemmes: entity.reserveFemmes,
  };
}

export function toTripRow(trip: NewTrip): Omit<TripEntity, 'id' | 'dateAnnulation' | 'dateFin'> {
  return {
    chauffeurId: trip.chauffeurId,
    vehiculeId: trip.vehiculeId,
    type: trip.type,
    statut: trip.statut,
    departLibelle: trip.depart.libelle,
    departLatitude: trip.depart.latitude,
    departLongitude: trip.depart.longitude,
    arriveeLibelle: trip.arrivee.libelle,
    arriveeLatitude: trip.arrivee.latitude,
    arriveeLongitude: trip.arrivee.longitude,
    chemin: trip.chemin,
    distanceMetres: trip.distanceMetres,
    dureeSecondes: trip.dureeSecondes,
    dateDepart: new Date(trip.dateDepart),
    placesTotal: trip.placesTotal,
    placesLibres: trip.placesLibres,
    reserveFemmes: trip.reserveFemmes,
  };
}

/** Changes with dates as Date objects, as the entity expects them. */
export function toTripChanges(changes: TripChanges): Partial<TripEntity> {
  const { dateDepart, dateAnnulation, dateFin, ...rest } = changes;
  const row: Partial<TripEntity> = { ...rest };
  if (dateDepart !== undefined) row.dateDepart = new Date(dateDepart);
  if (dateAnnulation !== undefined) row.dateAnnulation = date(dateAnnulation) ?? null;
  if (dateFin !== undefined) row.dateFin = date(dateFin) ?? null;
  return row;
}
