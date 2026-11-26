import type { StatutReservation } from '@contract';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { Booking, BookingChanges, NewBooking } from '../../../../domain/entity/Booking';
import { numericTransformer } from '../transformers';

/** Table reservation. The geography columns are computed by PostgreSQL. */
@Entity('reservation')
export class BookingEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'trajet_id', type: 'bigint', transformer: numericTransformer })
  trajetId!: number;

  @Column({ name: 'passager_id', type: 'bigint', transformer: numericTransformer })
  passagerId!: number;

  @Column({ type: 'int' })
  places!: number;

  @Column({ name: 'distance_metres', type: 'int' })
  distanceMetres!: number;

  @Column({ name: 'prix_par_place', type: 'int' })
  prixParPlace!: number;

  @Column({ name: 'prix_total', type: 'int' })
  prixTotal!: number;

  @Column({ name: 'prise_en_charge_libelle', type: 'varchar', length: 150 })
  priseEnChargeLibelle!: string;

  @Column({ name: 'prise_en_charge_latitude', type: 'decimal', precision: 10, scale: 7, transformer: numericTransformer })
  priseEnChargeLatitude!: number;

  @Column({ name: 'prise_en_charge_longitude', type: 'decimal', precision: 10, scale: 7, transformer: numericTransformer })
  priseEnChargeLongitude!: number;

  @Column({ name: 'depose_libelle', type: 'varchar', length: 150 })
  deposeLibelle!: string;

  @Column({ name: 'depose_latitude', type: 'decimal', precision: 10, scale: 7, transformer: numericTransformer })
  deposeLatitude!: number;

  @Column({ name: 'depose_longitude', type: 'decimal', precision: 10, scale: 7, transformer: numericTransformer })
  deposeLongitude!: number;

  @Column({ type: 'varchar', length: 30 })
  statut!: StatutReservation;

  @Column({ name: 'relance_de', type: 'bigint', nullable: true, transformer: numericTransformer })
  relanceDe!: number | null;

  @Column({ name: 'date_demande', type: 'timestamptz' })
  dateDemande!: Date;

  @Column({ name: 'date_expiration', type: 'timestamptz' })
  dateExpiration!: Date;

  @Column({ name: 'date_reponse', type: 'timestamptz', nullable: true })
  dateReponse!: Date | null;

  @Column({ name: 'date_sur_place', type: 'timestamptz', nullable: true })
  dateSurPlace!: Date | null;

  @Column({ name: 'fin_attente', type: 'timestamptz', nullable: true })
  finAttente!: Date | null;

  @Column({ type: 'int' })
  prolongations!: number;

  @Column({ name: 'date_debut_course', type: 'timestamptz', nullable: true })
  dateDebutCourse!: Date | null;

  @Column({ name: 'date_fin_course', type: 'timestamptz', nullable: true })
  dateFinCourse!: Date | null;

  @Column({ name: 'date_annulation', type: 'timestamptz', nullable: true })
  dateAnnulation!: Date | null;

  @Column({ name: 'motif_refus', type: 'varchar', length: 255, nullable: true })
  motifRefus!: string | null;
}

const iso = (date: Date | null): string | null => date?.toISOString() ?? null;

export function toBooking(entity: BookingEntity): Booking {
  return {
    id: entity.id,
    trajetId: entity.trajetId,
    passagerId: entity.passagerId,
    places: entity.places,
    distanceMetres: entity.distanceMetres,
    prixParPlace: entity.prixParPlace,
    prixTotal: entity.prixTotal,
    priseEnCharge: {
      libelle: entity.priseEnChargeLibelle,
      latitude: entity.priseEnChargeLatitude,
      longitude: entity.priseEnChargeLongitude,
    },
    depose: { libelle: entity.deposeLibelle, latitude: entity.deposeLatitude, longitude: entity.deposeLongitude },
    statut: entity.statut,
    relanceDe: entity.relanceDe,
    dateDemande: entity.dateDemande.toISOString(),
    dateExpiration: entity.dateExpiration.toISOString(),
    dateReponse: iso(entity.dateReponse),
    dateSurPlace: iso(entity.dateSurPlace),
    finAttente: iso(entity.finAttente),
    prolongations: entity.prolongations,
    dateDebutCourse: iso(entity.dateDebutCourse),
    dateFinCourse: iso(entity.dateFinCourse),
    dateAnnulation: iso(entity.dateAnnulation),
    motifRefus: entity.motifRefus,
  };
}

export function toBookingRow(booking: NewBooking): Partial<BookingEntity> {
  return {
    trajetId: booking.trajetId,
    passagerId: booking.passagerId,
    places: booking.places,
    distanceMetres: booking.distanceMetres,
    prixParPlace: booking.prixParPlace,
    prixTotal: booking.prixTotal,
    priseEnChargeLibelle: booking.priseEnCharge.libelle,
    priseEnChargeLatitude: booking.priseEnCharge.latitude,
    priseEnChargeLongitude: booking.priseEnCharge.longitude,
    deposeLibelle: booking.depose.libelle,
    deposeLatitude: booking.depose.latitude,
    deposeLongitude: booking.depose.longitude,
    statut: 'en_attente',
    relanceDe: booking.relanceDe,
    dateDemande: new Date(booking.dateDemande),
    dateExpiration: new Date(booking.dateExpiration),
    prolongations: 0,
  };
}

/** Changes with dates as Date objects, as the entity expects them. */
export function toBookingChanges(changes: BookingChanges): Partial<BookingEntity> {
  const { dateReponse, dateAnnulation, ...rest } = changes;
  const row: Partial<BookingEntity> = { ...rest };
  if (dateReponse !== undefined) row.dateReponse = dateReponse === null ? null : new Date(dateReponse);
  if (dateAnnulation !== undefined) row.dateAnnulation = dateAnnulation === null ? null : new Date(dateAnnulation);
  return row;
}
