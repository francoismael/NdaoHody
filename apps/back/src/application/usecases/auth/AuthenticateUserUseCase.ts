import { Injectable } from '@nestjs/common';
import type { User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { UserRepository } from '../../../domain/repository/UserRepository';
import { AccessTokenService } from '../../port/AccessTokenService';
import { assertAccountActive, SESSION_EXPIRED_MESSAGE } from '../../helper/accountStatus';

/**
 * Used by the guard of the app routes: access token -> active user.
 * The account is read on every call, so a suspension takes effect at once.
 */
@Injectable()
export class AuthenticateUserUseCase {
  constructor(
    private readonly accessTokens: AccessTokenService,
    private readonly users: UserRepository,
  ) {}

  async execute(accessToken: string): Promise<User> {
    const userId = this.accessTokens.verify(accessToken);
    if (userId === null) {
      throw new DomainException('unauthorized', SESSION_EXPIRED_MESSAGE);
    }
    const user = await this.users.findById(userId);
    assertAccountActive(user);
    return user;
  }
}
