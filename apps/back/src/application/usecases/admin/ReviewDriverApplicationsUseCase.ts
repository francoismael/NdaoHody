import { Injectable, Logger } from '@nestjs/common';
import type { AdminAccount } from '../../../domain/entity/AdminAccount';
import { hasEveryDocument, latestDocuments } from '../../../domain/entity/DriverDocument';
import type { User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { DriverDocumentRepository } from '../../../domain/repository/DriverDocumentRepository';
import { UserRepository } from '../../../domain/repository/UserRepository';
import type { RejectDriverRequest } from '../../dto/AdminRequests';
import type { DriverApplicationView } from '../../dto/AdminResponses';
import { PrivateFileStorage } from '../../port/PrivateFileStorage';
import { UnitOfWork } from '../../port/UnitOfWork';
import { UserNotifier } from '../../port/UserNotifier';
import { notifyBestEffort } from '../../helper/bestEffort';
import { toDocumentChauffeur } from '../../helper/driverDocumentView';

/**
 * Back-office queue of driver applications (statut_chauffeur = en_attente).
 * Approving: the 3 latest documents are validated, the user becomes a driver.
 * Refusing: the chosen documents are refused with a reason shown to the driver, who can send them again.
 */
@Injectable()
export class ReviewDriverApplicationsUseCase {
  private readonly logger = new Logger(ReviewDriverApplicationsUseCase.name);

  constructor(
    private readonly users: UserRepository,
    private readonly documents: DriverDocumentRepository,
    private readonly privateFiles: PrivateFileStorage,
    private readonly notifier: UserNotifier,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async listPending(viewer: AdminAccount): Promise<DriverApplicationView[]> {
    const applicants = await this.users.listByDriverStatus('en_attente');
    return Promise.all(applicants.map((user) => this.toView(user, viewer)));
  }

  async approve(admin: AdminAccount, userId: number): Promise<DriverApplicationView> {
    const { user, documents } = await this.findPending(userId);
    if (!hasEveryDocument(documents)) {
      throw new DomainException('conflict', 'Le dossier est incomplet : permis recto, verso et selfie sont nécessaires.');
    }

    const approved = await this.unitOfWork.run(async () => {
      await this.documents.review(
        latestDocuments(documents).map((document) => document.id),
        { statut: 'valide', motifRefus: null, verifiePar: admin.id },
      );
      return this.users.update(user.id, { statutChauffeur: 'valide' });
    });

    await this.notify(approved.id, 'kyc_valide', 'Dossier chauffeur validé', 'Tu peux maintenant publier des trajets.');
    return this.toView(approved, admin);
  }

  async reject(admin: AdminAccount, userId: number, request: RejectDriverRequest): Promise<DriverApplicationView> {
    const { user, documents } = await this.findPending(userId);
    const refusedTypes = request.documents?.length ? request.documents : null;
    const refused = latestDocuments(documents).filter((document) => !refusedTypes || refusedTypes.includes(document.type));

    const rejected = await this.unitOfWork.run(async () => {
      await this.documents.review(
        refused.map((document) => document.id),
        { statut: 'refuse', motifRefus: request.motif, verifiePar: admin.id },
      );
      return this.users.update(user.id, { statutChauffeur: 'refuse' });
    });

    await this.notify(rejected.id, 'kyc_refuse', 'Dossier chauffeur refusé', `${request.motif}. Renvoie les documents concernés.`);
    return this.toView(rejected, admin);
  }

  private async findPending(userId: number) {
    const user = await this.users.findById(userId);
    if (!user || user.statut === 'supprime') {
      throw new DomainException('not_found', 'Utilisateur introuvable.');
    }
    if (user.statutChauffeur !== 'en_attente') {
      throw new DomainException('conflict', "Ce dossier n'est pas en attente de validation.");
    }
    return { user, documents: await this.documents.listByUser(user.id) };
  }

  private async toView(user: User, viewer: AdminAccount): Promise<DriverApplicationView> {
    const base = { utilisateurId: user.id, statutChauffeur: user.statutChauffeur, dateCreation: user.dateCreation };
    if (viewer.role === 'investisseur') {
      return { ...base, nom: null, prenom: null, telephone: null, photoUrl: null, numeroPermis: null, documents: [] };
    }
    const documents = latestDocuments(await this.documents.listByUser(user.id));
    return {
      ...base,
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone,
      photoUrl: user.photoUrl,
      numeroPermis: user.numeroPermis,
      documents: documents.map((document) => toDocumentChauffeur(document, this.privateFiles)),
    };
  }

  private notify(utilisateurId: number, type: 'kyc_valide' | 'kyc_refuse', titre: string, message: string): Promise<void> {
    return notifyBestEffort(this.logger, this.notifier, { utilisateurId, type, titre, message, donnees: {} });
  }
}
