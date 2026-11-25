import type { User } from '../../domain/entity/User';
import { DomainException } from '../../domain/exception/DomainException';

/** Throws when the driver can no longer change their application (validated, or suspended by an admin). */
export function assertDriverCanApply(user: User): void {
  if (user.statutChauffeur === 'valide') {
    throw new DomainException('forbidden', 'Ton dossier chauffeur est déjà validé.');
  }
  assertDriverNotSuspended(user);
}

export function assertDriverNotSuspended(user: User): void {
  if (user.statutChauffeur === 'suspendu') {
    throw new DomainException('forbidden', 'Ton activité de chauffeur est suspendue. Contacte le support Ndaohody.');
  }
}
