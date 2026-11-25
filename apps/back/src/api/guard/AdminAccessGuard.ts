import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleAdmin } from '@contract';
import type { Request } from 'express';
import { AuthenticateAdminUseCase } from '../../application/usecases/admin/AuthenticateAdminUseCase';
import type { AdminAccount } from '../../domain/entity/AdminAccount';
import { DomainException } from '../../domain/exception/DomainException';
import { readBearerToken } from './bearerToken';

export const ADMIN_ROLES_KEY = 'adminRoles';
export const ALL_ADMIN_ROLES: readonly RoleAdmin[] = ['super_admin', 'admin', 'investisseur'];

/** Request of a back-office route once AdminAccessGuard has let it through. */
export interface AdminRequest extends Request {
  admin: AdminAccount;
}

/**
 * Back-office routes:
 * - a valid back-office token and an active account;
 * - a role listed by @AdminRoles() (every role when the route lists none);
 * - investisseur: read only, any other method than GET gets 403.
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

    const roles =
      this.reflector.getAllAndOverride<readonly RoleAdmin[] | undefined>(ADMIN_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? ALL_ADMIN_ROLES;
    if (!roles.includes(admin.role)) {
      throw new DomainException('forbidden', 'Ton rôle ne permet pas cette action.');
    }
    if (admin.role === 'investisseur' && request.method !== 'GET') {
      throw new DomainException('forbidden', 'Ton compte investisseur est en lecture seule.');
    }

    request.admin = admin;
    return true;
  }
}
