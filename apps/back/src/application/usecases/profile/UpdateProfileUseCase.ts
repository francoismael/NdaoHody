import { Injectable } from '@nestjs/common';
import { isProfileComplete, type User, type UserChanges } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { UserRepository } from '../../../domain/repository/UserRepository';
import type { UpdateProfileRequest } from '../../dto/ProfileRequests';
import { toMeResponse, type MeResponse } from '../../dto/MeResponse';

/**
 * PATCH /me: last name, first name, sex.
 * - The profile must be complete after the change (a new account sends the 3 fields at once).
 * - The sex cannot be changed once set: women-only trips rely on it.
 */
@Injectable()
export class UpdateProfileUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(user: User, request: UpdateProfileRequest): Promise<MeResponse> {
    if (user.sexe && request.sexe && request.sexe !== user.sexe) {
      throw new DomainException('forbidden', 'Le sexe ne peut plus être modifié. Contacte le support Ndaohody.');
    }

    const changes: UserChanges = {
      ...(request.nom === undefined ? {} : { nom: request.nom }),
      ...(request.prenom === undefined ? {} : { prenom: request.prenom }),
      ...(request.sexe === undefined ? {} : { sexe: request.sexe }),
    };
    if (!isProfileComplete({ ...user, ...changes })) {
      throw new DomainException('invalid', 'Le nom, le prénom et le sexe sont obligatoires.');
    }
    if (Object.keys(changes).length === 0) {
      return toMeResponse(user);
    }

    return toMeResponse(await this.users.update(user.id, changes));
  }
}
