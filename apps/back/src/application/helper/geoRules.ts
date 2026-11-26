import type { Position } from '@contract';
import { isInMadagascar } from '../../domain/entity/geo';
import { DomainException } from '../../domain/exception/DomainException';

/** Throws unless every point is in Madagascar (the app only works there; it also saves Mapbox calls). */
export function assertInMadagascar(...positions: Position[]): void {
  if (!positions.every(isInMadagascar)) {
    throw new DomainException('invalid', 'Ce point est en dehors de Madagascar.');
  }
}
