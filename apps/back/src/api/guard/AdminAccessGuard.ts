import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ActionAdmin } from '@contract/back-office';
import type { Request } from 'express';
import { AuthenticateAdminUseCase } from '../../application/usecases/admin/AuthenticateAdminUseCase';
import type { AdminAccount } from '../../domain/entity/AdminAccount';
import { canDo } from '../../domain/entity/adminPermissions';
import { DomainException } from '../../domain/exception/DomainException';
import { readBearerToken } from './bearerToken';

export const ADMIN_ACTION_KEY = 'adminAction';

/** Request of a back-office route once AdminAccessGuard has let it through. */
export interface AdminRequest extends Request {
  admin: AdminAccount;
}

/**
 * Back-office routes:
 * - a valid back-office token and an active account;
 * - the action set by @AdminAction() must be allowed to the role (ADMIN_PERMISSIONS);
 *   a route without action only needs a signed-in account (e.g. /auth/me);
 * - safety net: an investisseur never gets through with another method than GET.
 */
@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(
    private readonly authenticate: AuthenticateAdminUseCase,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const token = readBearerToken(request);
    if (!token) {
      throw new DomainException('unauthorized', 'Connecte-toi au back-office.');
    }
    const admin = await this.authenticate.execute(token);

    const action = this.reflector.getAllAndOverride<ActionAdmin | undefined>(ADMIN_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (action && !canDo(admin.role, action)) {
      throw new DomainException('forbidden', 'Ton rôle ne permet pas cette action.');
    }
    if (admin.role === 'investisseur' && request.method !== 'GET') {
      throw new DomainException('forbidden', 'Ton compte investisseur est en lecture seule.');
    }

    request.admin = admin;
    return true;
  }
}
