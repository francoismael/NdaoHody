import { Injectable } from '@nestjs/common';
import type { StatutTrajet, StatutVehicule } from '@contract';
import { Not } from 'typeorm';
import type { NewVehicle, Vehicle, VehicleChanges } from '../../../../domain/entity/Vehicle';
import { VehicleRepository } from '../../../../domain/repository/VehicleRepository';
import { VehicleEntity } from '../entities/VehicleEntity';
import { TransactionContext } from '../TransactionContext';

/** Trips that still need their vehicle. */
const ACTIVE_TRIP_STATUSES: readonly StatutTrajet[] = ['publie', 'en_route', 'en_cours'];

@Injectable()
export class TypeOrmVehicleRepository extends VehicleRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  findById(id: number): Promise<Vehicle | null> {
    return this.context.repository(VehicleEntity).findOneBy({ id });
  }

  findByPlate(immatriculation: string): Promise<Vehicle | null> {
    return this.context.repository(VehicleEntity).findOneBy({ immatriculation });
  }

  listByOwner(utilisateurId: number): Promise<Vehicle[]> {
    return this.context.repository(VehicleEntity).find({
      where: { utilisateurId, statut: Not('archive') },
      order: { parDefaut: 'DESC', id: 'ASC' },
    });
  }

  listByStatus(statut: StatutVehicule): Promise<Vehicle[]> {
    return this.context.repository(VehicleEntity).find({ where: { statut }, order: { id: 'ASC' } });
  }

  async create(vehicle: NewVehicle): Promise<Vehicle> {
    const repository = this.context.repository(VehicleEntity);
    return repository.save(repository.create({ ...vehicle, statut: 'en_attente', motifRefus: null }));
  }

  async update(id: number, changes: VehicleChanges): Promise<Vehicle> {
    const repository = this.context.repository(VehicleEntity);
    await repository.update({ id }, changes);
    return repository.findOneByOrFail({ id });
  }

  async clearDefault(utilisateurId: number): Promise<void> {
    await this.context.repository(VehicleEntity).update({ utilisateurId, parDefaut: true }, { parDefaut: false });
  }

  async isUsedByActiveTrip(id: number): Promise<boolean> {
    const rows: { utilise: boolean }[] = await this.context.manager().query(
      `SELECT EXISTS (SELECT 1 FROM trajet WHERE vehicule_id = $1 AND statut = ANY($2)) AS utilise`,
      [id, ACTIVE_TRIP_STATUSES],
    );
    return rows[0]?.utilise === true;
  }
}
