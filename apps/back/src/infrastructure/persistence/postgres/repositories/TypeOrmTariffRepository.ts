import { Injectable } from '@nestjs/common';
import type { Tarif, TypeVehicule } from '@contract';
import { TariffRepository } from '../../../../domain/repository/TariffRepository';
import { TariffEntity } from '../entities/TariffEntity';
import { TransactionContext } from '../TransactionContext';

@Injectable()
export class TypeOrmTariffRepository extends TariffRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  /** The table always holds both rates (inserted by the pricing migration). */
  findByVehicleType(typeVehicule: TypeVehicule): Promise<Tarif> {
    return this.context.repository(TariffEntity).findOneByOrFail({ typeVehicule });
  }
}
