import { Injectable } from '@nestjs/common';
import type { StatutChauffeur } from '@contract';
import { hasEveryDocument, latestDocuments } from '../../../domain/entity/DriverDocument';
import { matchIdentity, normalizeLicenseNumber } from '../../../domain/entity/DriverIdentity';
import type { User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { DriverDocumentRepository } from '../../../domain/repository/DriverDocumentRepository';
import { UserRepository } from '../../../domain/repository/UserRepository';
import type { SubmitDocumentRequest } from '../../dto/DriverRequests';
import type { SubmitDocumentResponse } from '../../dto/DriverResponses';
import { Clock } from '../../port/Clock';
import { ImageProcessor } from '../../port/ImageProcessor';
import { PrivateFileStorage } from '../../port/PrivateFileStorage';
import { UnitOfWork } from '../../port/UnitOfWork';
import { AccountRecoveryService, type ReactivatedAccount } from '../../service/AccountRecoveryService';
import { assertDriverCanApply } from '../../helper/driverRules';
import { toDocumentChauffeur } from '../../helper/driverDocumentView';
import { assertImage, type UploadedImage } from '../../helper/uploadedImage';

export const DOCUMENTS_FOLDER = 'documents';
export const LICENSE_TAKEN_MESSAGE =
  'Ce permis est déjà lié à un autre compte Ndaohody. Contacte le support si c’est bien le tien.';

/**
 * POST /me/documents: licence front (with its number), licence back, selfie.
 * The licence number is checked against EVERY account, deleted ones included:
 * a known number on a deleted account reactivates that old account (see AccountRecoveryService).
 * Once the 3 documents are there, the application waits for an admin (statut_chauffeur = en_attente).
 */
@Injectable()
export class SubmitDriverDocumentUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly documents: DriverDocumentRepository,
    private readonly images: ImageProcessor,
    private readonly privateFiles: PrivateFileStorage,
    private readonly recovery: AccountRecoveryService,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(
    user: User,
    request: SubmitDocumentRequest,
    file: UploadedImage | undefined,
  ): Promise<SubmitDocumentResponse> {
    assertDriverCanApply(user);
    assertImage(file);
    const numeroPermis = this.readLicenseNumber(user, request);

    // Disk first, outside the transaction (an unused file is harmless, a missing one is not).
    const image = await this.images.toDocumentImage(file.content);
    const key = await this.privateFiles.save(DOCUMENTS_FOLDER, image.content, image.extension);

    return this.unitOfWork.run(async () => {
      let owner = user;
      let compteReactive: ReactivatedAccount | null = null;

      if (numeroPermis) {
        const match = matchIdentity(user, await this.users.findByLicenseNumber(numeroPermis));
        if (match.kind === 'refuse') {
          throw new DomainException('conflict', LICENSE_TAKEN_MESSAGE);
        }
        if (match.kind === 'recover') {
          compteReactive = await this.recovery.recover(user, match.previous);
          owner = compteReactive.utilisateur;
        } else if (owner.numeroPermis !== numeroPermis) {
          owner = await this.users.update(owner.id, { numeroPermis });
        }
      }

      await this.documents.create({ utilisateurId: owner.id, type: request.type, fichierUrl: key, dateEnvoi: this.clock.now() });
      owner = await this.refreshDriverStatus(owner);

      const documents = latestDocuments(await this.documents.listByUser(owner.id));
      return {
        statutChauffeur: owner.statutChauffeur,
        numeroPermis: owner.numeroPermis,
        documents: documents.map((document) => toDocumentChauffeur(document, this.privateFiles)),
        compteReactive,
      };
    });
  }

  /** The licence front comes first and carries the number, so the old account is found before anything else. */
  private readLicenseNumber(user: User, request: SubmitDocumentRequest): string | null {
    if (request.type !== 'permis_recto') {
      if (!user.numeroPermis) {
        throw new DomainException('invalid', "Envoie d'abord le recto de ton permis avec son numéro.");
      }
      return null;
    }
    const numeroPermis = normalizeLicenseNumber(request.numeroPermis ?? '');
    if (!numeroPermis) {
      throw new DomainException('invalid', 'Indique le numéro de ton permis (5 à 20 lettres ou chiffres).');
    }
    return numeroPermis;
  }

  /** en_attente as soon as the 3 latest documents are there and none of them is refused. */
  private async refreshDriverStatus(owner: User): Promise<User> {
    const documents = await this.documents.listByUser(owner.id);
    const ready = hasEveryDocument(documents) && latestDocuments(documents).every((document) => document.statut !== 'refuse');
    const statutChauffeur: StatutChauffeur = ready ? 'en_attente' : owner.statutChauffeur;
    return statutChauffeur === owner.statutChauffeur ? owner : this.users.update(owner.id, { statutChauffeur });
  }
}
