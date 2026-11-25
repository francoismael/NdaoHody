import { Injectable } from '@nestjs/common';
import type { Mode } from '@contract';
import type { User } from '../../../domain/entity/User';
import { UserRepository } from '../../../domain/repository/UserRepository';
import { toMeResponse, type MeResponse } from '../../dto/MeResponse';

/**
 * PATCH /me/mode: passenger <-> driver space.
 * Anyone can open the driver space (to send their documents);
 * publishing a trip will require a validated driver (step 6).
 */
@Injectable()
export class SwitchModeUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(user: User, mode: Mode): Promise<MeResponse> {
    if (user.modeActuel === mode) {
      return toMeResponse(user);
    }
    return toMeResponse(await this.users.update(user.id, { modeActuel: mode }));
  }
}
