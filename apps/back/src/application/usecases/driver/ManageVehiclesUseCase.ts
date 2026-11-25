import { Injectable } from '@nestjs/common';
import type { User } from '../../../domain/entity/User';
import { isValidSeatCount, type Vehicle, type VehicleChanges } from '../../../domain/entity/Vehicle';
import { DomainException } from '../../../domain/exception/DomainException';
import { VehicleRepository } from '../../../domain/repository/VehicleRepository';
import type { UpdateVehicleRequest } from '../../dto/DriverRequests';
import { UnitOfWork } from '../../port/UnitOfWork';
import { INVALID_SEATS_MESSAGE } from './AddVehicleUseCase';

const VEHICLE_NOT_FOUND_MESSAGE = 'Véhicule introuvable.';

/** GET, PATCH and DELETE /me/vehicles. */
@Injectable()
export class ManageVehiclesUseCase {
  constructor(
    private readonly vehicles: VehicleRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  list(user: User): Promise<Vehicle[]> {
    return this.vehicles.listByOwner(user.id);
  }

  /** A change of description sends a validated vehicle back to the admins. */
  async update(user: User, vehicleId: number, request: UpdateVehicleRequest): Promise<Vehicle> {
    const vehicle = await this.findOwn(user, vehicleId);
    const places = request.places ?? vehicle.places;
    if (!isValidSeatCount(vehicle.type, places)) {
      throw new DomainException('invalid', INVALID_SEATS_MESSAGE);
    }

    const description: VehicleChanges = {
      ...(request.marque === undefined ? {} : { marque: request.marque }),
      ...(request.modele === undefined ? {} : { modele: request.modele }),
      ...(request.couleur === undefined ? {} : { couleur: request.couleur }),
      ...(request.places === undefined ? {} : { places: request.places }),
    };
    const described = Object.entries(description).some(([key, value]) => vehicle[key as keyof Vehicle] !== value);
    const changes: VehicleChanges = {
      ...description,
      ...(described && vehicle.statut === 'valide' ? { statut: 'en_attente' as const } : {}),
      ...(request.parDefaut ? { parDefaut: true } : {}),
    };

    return this.unitOfWork.run(async () => {
      if (request.parDefaut && !vehicle.parDefaut) {
        await this.vehicles.clearDefault(user.id);
      }
      return this.vehicles.update(vehicle.id, changes);
    });
  }

  /**
   * The row is archived, never deleted: its plate stays tied to this driver
   * (and to the trips made with it). Another vehicle becomes the default one.
   */
  async archive(user: User, vehicleId: number): Promise<void> {
    const vehicle = await this.findOwn(user, vehicleId);
    if (await this.vehicles.isUsedByActiveTrip(vehicle.id)) {
      throw new DomainException('conflict', 'Ce véhicule est utilisé par un trajet publié ou en cours.');
    }

    await this.unitOfWork.run(async () => {
      await this.vehicles.update(vehicle.id, { statut: 'archive', parDefaut: false });
      const [next] = await this.vehicles.listByOwner(user.id);
      if (vehicle.parDefaut && next) {
        await this.vehicles.update(next.id, { parDefaut: true });
      }
    });
  }

  private async findOwn(user: User, vehicleId: number): Promise<Vehicle> {
    const vehicle = await this.vehicles.findById(vehicleId);
    if (!vehicle || vehicle.utilisateurId !== user.id || vehicle.statut === 'archive') {
      throw new DomainException('not_found', VEHICLE_NOT_FOUND_MESSAGE);
    }
    return vehicle;
  }
}
