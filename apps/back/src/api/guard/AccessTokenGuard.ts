import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SESSION_EXPIRED_MESSAGE } from '../../application/helper/accountStatus';
import { AuthenticateUserUseCase } from '../../application/usecases/auth/AuthenticateUserUseCase';
import { DomainException } from '../../domain/exception/DomainException';
import { AuthenticatedRequest, readBearerToken } from './bearerToken';

/**
 * App routes: requires a valid access token and an active account,
 * then puts the user on the request (read it with @CurrentUser()).
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly authenticate: AuthenticateUserUseCase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readBearerToken(request);
    if (!token) {
      throw new DomainException('unauthorized', SESSION_EXPIRED_MESSAGE);
    }
    request.user = await this.authenticate.execute(token);
    return true;
  }
}
