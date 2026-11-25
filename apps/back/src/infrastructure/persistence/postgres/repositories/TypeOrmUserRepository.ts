import { Injectable } from '@nestjs/common';
import type { StatutChauffeur, StatutReservation, StatutTrajet } from '@contract';
import { Not } from 'typeorm';
import type { User, UserChanges } from '../../../../domain/entity/User';
import { UserRepository } from '../../../../domain/repository/UserRepository';
import { toUser, UserEntity } from '../entities/UserEntity';
import { TransactionContext } from '../TransactionContext';

/** Bookings during which the passenger is busy (driver coming, waiting, on board). */
const BOOKING_STATUSES_IN_PROGRESS: readonly StatutReservation[] = ['acceptee', 'chauffeur_sur_place', 'en_course'];
/** Trips that have started. */
const TRIP_STATUSES_IN_PROGRESS: readonly StatutTrajet[] = ['en_route', 'en_cours'];

@Injectable()
export class TypeOrmUserRepository extends UserRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  async findById(id: number): Promise<User | null> {
    const entity = await this.context.repository(UserEntity).findOneBy({ id });
    return entity ? toUser(entity) : null;
  }

  async findByPhone(telephone: string): Promise<User | null> {
    const entity = await this.context.repository(UserEntity).findOneBy({ telephone });
    return entity ? toUser(entity) : null;
  }

  async findByLicenseNumber(numeroPermis: string): Promise<User | null> {
    const entity = await this.context.repository(UserEntity).findOneBy({ numeroPermis });
    return entity ? toUser(entity) : null;
  }

  async listByDriverStatus(statutChauffeur: StatutChauffeur): Promise<User[]> {
    const entities = await this.context.repository(UserEntity).find({
      where: { statutChauffeur, statut: Not('supprime') },
      order: { dateCreation: 'ASC' },
    });
    return entities.map(toUser);
  }

  async createWithVerifiedPhone(telephone: string, dateCreation: Date): Promise<User> {
    const repository = this.context.repository(UserEntity);
    const { identifiers } = await repository.insert({ telephone, telephoneVerifie: true, dateCreation });
    // Read the row back: the other columns get their default values from the database.
    return toUser(await repository.findOneByOrFail({ id: Number(identifiers[0]?.['id']) }));
  }

  async update(id: number, changes: UserChanges): Promise<User> {
    const repository = this.context.repository(UserEntity);
    await repository.update({ id }, changes);
    return toUser(await repository.findOneByOrFail({ id }));
  }

  async hasRideInProgress(id: number): Promise<boolean> {
    const rows: { en_course: boolean }[] = await this.context.manager().query(
      `SELECT EXISTS (
         SELECT 1 FROM reservation WHERE passager_id = $1 AND statut = ANY($2)
         UNION ALL
         SELECT 1 FROM trajet WHERE chauffeur_id = $1 AND statut = ANY($3)
       ) AS en_course`,
      [id, BOOKING_STATUSES_IN_PROGRESS, TRIP_STATUSES_IN_PROGRESS],
    );
    return rows[0]?.en_course === true;
  }
}
