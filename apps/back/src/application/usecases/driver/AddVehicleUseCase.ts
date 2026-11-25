import { Injectable } from '@nestjs/common';
import { matchIdentity, normalizePlateNumber } from '../../../domain/entity/DriverIdentity';
import type { User } from '../../../domain/entity/User';
import { isValidSeatCount, type Vehicle } from '../../../domain/entity/Vehicle';
import { DomainException } from '../../../domain/exception/DomainException';
import { UserRepository } from '../../../domain/repository/UserRepository';
import { VehicleRepository } from '../../../domain/repository/VehicleRepository';
import type { AddVehicleRequest } from '../../dto/DriverRequests';
import type { AddVehicleResponse } from '../../dto/DriverResponses';
import { FileStorage } from '../../port/FileStorage';
import { ImageProcessor } from '../../port/ImageProcessor';
import { UnitOfWork } from '../../port/UnitOfWork';
import { AccountRecoveryService, type ReactivatedAccount } from '../../service/AccountRecoveryService';
import { assertDriverNotSuspended } from '../../helper/driverRules';
import { assertImage, type UploadedImage } from '../../helper/uploadedImage';

export const VEHICLES_FOLDER = 'vehicules';
export const INVALID_SEATS_MESSAGE = 'Une moto a 1 place ; une voiture de 1 à 8 places.';
export const PLATE_TAKEN_MESSAGE =
  'Ce véhicule est déjà enregistré sur un autre compte Ndaohody. Contacte le support si c’est bien le tien.';

/**
 * POST /me/vehicles: a new vehicle, checked by an admin before it can be used.
 * The plate is unique across EVERY account, deleted ones included:
 * a plate of a deleted account reactivates that old account (see AccountRecoveryService).
 */
@Injectable()
export class AddVehicleUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly vehicles: VehicleRepository,
    private readonly images: ImageProcessor,
    private readonly storage: FileStorage,
    private readonly recovery: AccountRecoveryService,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(user: User, request: AddVehicleRequest, file: UploadedImage | undefined): Promise<AddVehicleResponse> {
    assertDriverNotSuspended(user);
    assertImage(file);
    const immatriculation = normalizePlateNumber(request.immatriculation);
    if (!immatriculation) {
      throw new DomainException('invalid', 'Immatriculation invalide. Exemple : 1234 TBA.');
    }
    if (!isValidSeatCount(request.type, request.places)) {
      throw new DomainException('invalid', INVALID_SEATS_MESSAGE);
    }

    const image = await this.images.toDocumentImage(file.content);
    const photoUrl = await this.storage.save(VEHICLES_FOLDER, image.content, image.extension);

    return this.unitOfWork.run(async () => {
      let owner = user;
      let compteReactive: ReactivatedAccount | null = null;

      const existing = await this.vehicles.findByPlate(immatriculation);
      if (existing) {
        const match = matchIdentity(user, await this.users.findById(existing.utilisateurId));
        if (match.kind === 'refuse') {
          throw new DomainException('conflict', PLATE_TAKEN_MESSAGE);
        }
        if (match.kind === 'recover') {
          compteReactive = await this.recovery.recover(user, match.previous);
          owner = compteReactive.utilisateur;
        } else if (existing.statut !== 'archive') {
          throw new DomainException('conflict', 'Ce véhicule est déjà dans ta liste.');
        }
      }

      const others = (await this.vehicles.listByOwner(owner.id)).filter((vehicle) => vehicle.id !== existing?.id);
      // Only one default vehicle per driver (uq_vehicule_un_par_defaut): the first one, or the one it already was.
      const isDefault = others.length === 0 || (existing?.parDefaut ?? false);
      const details = {
        type: request.type,
        marque: request.marque ?? null,
        modele: request.modele ?? null,
        couleur: request.couleur,
        places: request.places,
        photoUrl,
        parDefaut: isDefault,
      };
      // A known plate keeps its row (history of the trips made with it), checked again by an admin.
      const vehicule: Vehicle = existing
        ? await this.vehicles.update(existing.id, { ...details, utilisateurId: owner.id, statut: 'en_attente', motifRefus: null })
        : await this.vehicles.create({ ...details, utilisateurId: owner.id, immatriculation });

      return { vehicule, compteReactive };
    });
  }
}
