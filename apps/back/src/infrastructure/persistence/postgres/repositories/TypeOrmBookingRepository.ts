import { Injectable } from '@nestjs/common';
import type { StatutReservation } from '@contract';
import { And, In, LessThan, MoreThanOrEqual } from 'typeorm';
import { ACTIVE_BOOKING_STATUSES, type Booking, type BookingChanges, type NewBooking } from '../../../../domain/entity/Booking';
import { BookingRepository } from '../../../../domain/repository/BookingRepository';
import { BookingEntity, toBooking, toBookingChanges, toBookingRow } from '../entities/BookingEntity';
import { TripEntity } from '../entities/TripEntity';
import { TransactionContext } from '../TransactionContext';

@Injectable()
export class TypeOrmBookingRepository extends BookingRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  async create(booking: NewBooking): Promise<Booking> {
    const repository = this.context.repository(BookingEntity);
    return toBooking(await repository.save(repository.create(toBookingRow(booking))));
  }

  async findById(id: number): Promise<Booking | null> {
    const entity = await this.context.repository(BookingEntity).findOneBy({ id });
    return entity ? toBooking(entity) : null;
  }

  async listByPassenger(passagerId: number): Promise<Booking[]> {
    const entities = await this.context.repository(BookingEntity).find({ where: { passagerId }, order: { dateDemande: 'DESC' } });
    return entities.map(toBooking);
  }

  async listWaitingForDriver(chauffeurId: number): Promise<Booking[]> {
    const entities = await this.context
      .repository(BookingEntity)
      .createQueryBuilder('r')
      .innerJoin(TripEntity, 't', 't.id = r.trajetId')
      .where('t.chauffeurId = :chauffeurId AND r.statut = :statut', { chauffeurId, statut: 'en_attente' })
      .orderBy('r.dateDemande', 'ASC')
      .getMany();
    return entities.map(toBooking);
  }

  async listOnTrip(trajetId: number, statuts: readonly StatutReservation[]): Promise<Booking[]> {
    const entities = await this.context.repository(BookingEntity).find({ where: { trajetId, statut: In([...statuts]) } });
    return entities.map(toBooking);
  }

  async findActive(trajetId: number, passagerId: number): Promise<Booking | null> {
    const entity = await this.context
      .repository(BookingEntity)
      .findOneBy({ trajetId, passagerId, statut: In([...ACTIVE_BOOKING_STATUSES]) });
    return entity ? toBooking(entity) : null;
  }

  async transition(id: number, from: readonly StatutReservation[], changes: BookingChanges): Promise<Booking | null> {
    const repository = this.context.repository(BookingEntity);
    // The status is checked in the same statement: if another request changed it first, nothing is updated.
    const result = await repository.update({ id, statut: In([...from]) }, toBookingChanges(changes));
    if (result.affected !== 1) {
      return null;
    }
    return toBooking(await repository.findOneByOrFail({ id }));
  }

  async expireDue(now: Date): Promise<Booking[]> {
    const rows: { id: number }[] = await this.context.manager().query(
      `UPDATE reservation SET statut = 'expiree'
       WHERE statut = 'en_attente' AND date_expiration <= $1
       RETURNING id`,
      [now],
    );
    if (rows.length === 0) {
      return [];
    }
    const entities = await this.context.repository(BookingEntity).findBy({ id: In(rows.map((row) => Number(row.id))) });
    return entities.map(toBooking);
  }

  async listWaitEndedBetween(from: Date, to: Date): Promise<Booking[]> {
    const entities = await this.context.repository(BookingEntity).find({
      where: { statut: 'chauffeur_sur_place', finAttente: And(MoreThanOrEqual(from), LessThan(to)) },
    });
    return entities.map(toBooking);
  }

  async listFinishedWithoutReviewBetween(from: Date, to: Date): Promise<Booking[]> {
    const entities = await this.context
      .repository(BookingEntity)
      .createQueryBuilder('r')
      .where('r.statut = :statut AND r.dateFinCourse >= :from AND r.dateFinCourse < :to', { statut: 'terminee', from, to })
      .andWhere('NOT EXISTS (SELECT 1 FROM avis a WHERE a.reservation_id = r.id AND a.auteur_id = r.passager_id)')
      .getMany();
    return entities.map(toBooking);
  }

  async countRetries(id: number): Promise<number> {
    const rows: { relances: string }[] = await this.context.manager().query(
      `WITH RECURSIVE chaine AS (
         SELECT id, relance_de FROM reservation WHERE id = $1
         UNION ALL
         SELECT r.id, r.relance_de FROM reservation r JOIN chaine c ON r.id = c.relance_de
       )
       SELECT count(*) - 1 AS relances FROM chaine`,
      [id],
    );
    return Number(rows[0]?.relances ?? 0);
  }
}
