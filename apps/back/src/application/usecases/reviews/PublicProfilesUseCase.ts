import { Injectable } from '@nestjs/common';
import type { ProfilChauffeurPublic, ProfilPublic } from '@contract';
import type { User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { UserRepository } from '../../../domain/repository/UserRepository';
import { VehicleRepository } from '../../../domain/repository/VehicleRepository';
import { toPublicProfile } from '../../helper/rideViews';

/** GET /users/:id/public and GET /drivers/:id/public: what anybody may see of a user (never his phone). */
@Injectable()
export class PublicProfilesUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly vehicles: VehicleRepository,
  ) {}

  async user(userId: number): Promise<ProfilPublic> {
    return toPublicProfile(await this.findVisible(userId));
  }

  async driver(driverId: number): Promise<ProfilChauffeurPublic> {
    const driver = await this.findVisible(driverId);
    if (driver.statutChauffeur !== 'valide') {
      throw new DomainException('not_found', 'Chauffeur introuvable.');
    }
    const vehicle = (await this.vehicles.listByOwner(driver.id)).find((candidate) => candidate.parDefaut && candidate.statut === 'valide');
    return {
      ...toPublicProfile(driver),
      nombreCourses: driver.coursesChauffeur,
      vehicule: vehicle ? { type: vehicle.type, marque: vehicle.marque, modele: vehicle.modele, couleur: vehicle.couleur } : null,
    };
  }

  private async findVisible(userId: number): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user || user.statut === 'supprime') {
      throw new DomainException('not_found', 'Utilisateur introuvable.');
    }
    return user;
  }
}
