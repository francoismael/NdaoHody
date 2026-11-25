import { Injectable } from '@nestjs/common';
import { latestDocuments } from '../../../domain/entity/DriverDocument';
import type { User } from '../../../domain/entity/User';
import { DriverDocumentRepository } from '../../../domain/repository/DriverDocumentRepository';
import type { DriverApplicationResponse } from '../../dto/DriverResponses';
import { PrivateFileStorage } from '../../port/PrivateFileStorage';
import { toDocumentChauffeur } from '../../helper/driverDocumentView';

/** GET /me/documents. */
@Injectable()
export class GetDriverApplicationUseCase {
  constructor(
    private readonly documents: DriverDocumentRepository,
    private readonly privateFiles: PrivateFileStorage,
  ) {}

  async execute(user: User): Promise<DriverApplicationResponse> {
    const documents = latestDocuments(await this.documents.listByUser(user.id));
    return {
      statutChauffeur: user.statutChauffeur,
      numeroPermis: user.numeroPermis,
      documents: documents.map((document) => toDocumentChauffeur(document, this.privateFiles)),
    };
  }
}
