import type { User } from '../../domain/entity/User';
import { DomainException } from '../../domain/exception/DomainException';

export const SUSPENDED_ACCOUNT_MESSAGE =
  'Ton compte est suspendu. Contacte le support Ndaohody pour en savoir plus.';
export const SESSION_EXPIRED_MESSAGE = 'Ta session a expiré. Reconnecte-toi.';

/** Throws unless the account can use the app (not suspended, not deleted). */
export function assertAccountActive(user: User | null): asserts user is User {
  if (!user || user.statut === 'supprime') {
    throw new DomainException('unauthorized', SESSION_EXPIRED_MESSAGE);
  }
  if (user.statut === 'suspendu') {
    throw new DomainException('forbidden', SUSPENDED_ACCOUNT_MESSAGE);
  }
}
