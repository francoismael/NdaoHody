import { Injectable, Logger } from '@nestjs/common';
import type { AdminAccount } from '../../../domain/entity/AdminAccount';
import type { Vehicle } from '../../../domain/entity/Vehicle';
import { DomainException } from '../../../domain/exception/DomainException';
import { UserRepository } from '../../../domain/repository/UserRepository';
import { VehicleRepository } from '../../../domain/repository/VehicleRepository';
import type { VehicleView } from '../../dto/AdminResponses';
import { UserNotifier } from '../../port/UserNotifier';
import { notifyBestEffort } from '../../helper/bestEffort';

/** Back-office queue of vehicles waiting for validation. */
@Injectable()
export class ReviewVehiclesUseCase {
  private readonly logger = new Logger(ReviewVehiclesUseCase.name);

  constructor(
    private readonly vehicles: VehicleRepository,
    private readonly users: UserRepository,
    private readonly notifier: UserNotifier,
  ) {}

  async listPending(viewer: AdminAccount): Promise<VehicleView[]> {
    const pending = await this.vehicles.listByStatus('en_attente');
    return Promise.all(pending.map((vehicle) => this.toView(vehicle, viewer)));
  }

  async approve(admin: AdminAccount, vehicleId: number): Promise<VehicleView> {
    const vehicle = await this.findPending(vehicleId);
    const approved = await this.vehicles.update(vehicle.id, { statut: 'valide', motifRefus: null });
    await this.notify(approved, 'kyc_valide', 'Véhicule validé', `Ton véhicule ${approved.immatriculation} est validé.`);
    return this.toView(approved, admin);
  }

  async reject(admin: AdminAccount, vehicleId: number, motif: string): Promise<VehicleView> {
    const vehicle = await this.findPending(vehicleId);
    const rejected = await this.vehicles.update(vehicle.id, { statut: 'refuse', motifRefus: motif });
    await this.notify(rejected, 'kyc_refuse', 'Véhicule refusé', `${rejected.immatriculation} : ${motif}.`);
    return this.toView(rejected, admin);
  }

  private async findPending(vehicleId: number): Promise<Vehicle> {
    const vehicle = await this.vehicles.findById(vehicleId);
    if (!vehicle) {
      throw new DomainException('not_found', 'Véhicule introuvable.');
    }
    if (vehicle.statut !== 'en_attente') {
      throw new DomainException('conflict', "Ce véhicule n'est pas en attente de validation.");
    }
    return vehicle;
  }

  private async toView(vehicle: Vehicle, viewer: AdminAccount): Promise<VehicleView> {
    if (viewer.role === 'investisseur') {
      return {
        vehicule: { ...vehicle, immatriculation: null, photoUrl: null },
        proprietaire: { utilisateurId: vehicle.utilisateurId, nom: null, prenom: null },
      };
    }
    const owner = await this.users.findById(vehicle.utilisateurId);
    return {
      vehicule: vehicle,
      proprietaire: { utilisateurId: vehicle.utilisateurId, nom: owner?.nom ?? null, prenom: owner?.prenom ?? null },
    };
  }

  private notify(vehicle: Vehicle, type: 'kyc_valide' | 'kyc_refuse', titre: string, message: string): Promise<void> {
    return notifyBestEffort(this.logger, this.notifier, { utilisateurId: vehicle.utilisateurId, type, titre, message, donnees: {} });
  }
}
