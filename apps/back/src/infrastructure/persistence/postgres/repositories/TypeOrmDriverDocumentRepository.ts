import { Injectable } from '@nestjs/common';
import type { StatutValidation } from '@contract';
import { In } from 'typeorm';
import type { DriverDocument, NewDriverDocument } from '../../../../domain/entity/DriverDocument';
import { DriverDocumentRepository } from '../../../../domain/repository/DriverDocumentRepository';
import { DriverDocumentEntity } from '../entities/DriverDocumentEntity';
import { TransactionContext } from '../TransactionContext';

@Injectable()
export class TypeOrmDriverDocumentRepository extends DriverDocumentRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  listByUser(utilisateurId: number): Promise<DriverDocument[]> {
    return this.context.repository(DriverDocumentEntity).find({
      where: { utilisateurId },
      order: { dateEnvoi: 'DESC', id: 'DESC' },
    });
  }

  async create(document: NewDriverDocument): Promise<DriverDocument> {
    const repository = this.context.repository(DriverDocumentEntity);
    return repository.save(repository.create({ ...document, statut: 'en_attente', motifRefus: null, verifiePar: null }));
  }

  async review(
    ids: readonly number[],
    decision: { statut: StatutValidation; motifRefus: string | null; verifiePar: number },
  ): Promise<void> {
    if (ids.length > 0) {
      await this.context.repository(DriverDocumentEntity).update({ id: In([...ids]) }, decision);
    }
  }
}
