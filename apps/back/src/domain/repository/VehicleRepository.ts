import type { StatutVehicule } from '@contract';
import type { NewVehicle, Vehicle, VehicleChanges } from '../entity/Vehicle';

export abstract class VehicleRepository {
  abstract findById(id: number): Promise<Vehicle | null>;

  /** Searches every vehicle, archived ones and those of deleted accounts included. */
  abstract findByPlate(immatriculation: string): Promise<Vehicle | null>;

  /** Vehicles of a driver, archived ones excluded, default first. */
  abstract listByOwner(utilisateurId: number): Promise<Vehicle[]>;

  /** Every vehicle with this status, oldest first. */
  abstract listByStatus(statut: StatutVehicule): Promise<Vehicle[]>;

  abstract create(vehicle: NewVehicle): Promise<Vehicle>;

  abstract update(id: number, changes: VehicleChanges): Promise<Vehicle>;

  /** Removes the "default" mark from every vehicle of the driver. */
  abstract clearDefault(utilisateurId: number): Promise<void>;

  /** true when a trip that is published or under way uses this vehicle. */
  abstract isUsedByActiveTrip(id: number): Promise<boolean>;
}
