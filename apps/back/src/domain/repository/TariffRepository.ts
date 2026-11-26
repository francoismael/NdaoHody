import type { Tarif, TypeVehicule } from '@contract';

/** Rates per vehicle type (table tarif). */
export abstract class TariffRepository {
  abstract findByVehicleType(type: TypeVehicule): Promise<Tarif>;
}
