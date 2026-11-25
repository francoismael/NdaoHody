import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { RoleAdmin } from '@contract';
import { ApiErrorResponse } from '../../application/dto/ApiErrorResponse';
import type { AdminAccount } from '../../domain/entity/AdminAccount';
import { ADMIN_ROLES_KEY, AdminAccessGuard, type AdminRequest } from '../guard/AdminAccessGuard';
import { AdminJournalInterceptor, AUDIT_KEY, type AuditMetadata } from '../interceptor/AdminJournalInterceptor';

/** Put on every back-office controller: token check, roles, read-only investisseur, journal of writes. */
export function AdminAuthenticated(): ClassDecorator & MethodDecorator {
  return applyDecorators(
    UseGuards(AdminAccessGuard),
    UseInterceptors(AdminJournalInterceptor),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ type: ApiErrorResponse, description: 'Missing, invalid or expired back-office token.' }),
    ApiForbiddenResponse({ type: ApiErrorResponse, description: 'Deactivated account, role not allowed or read-only.' }),
  );
}

/** Roles allowed on a route or a controller (default: every role, the investisseur read only). */
export function AdminRoles(...roles: RoleAdmin[]): ClassDecorator & MethodDecorator {
  return SetMetadata(ADMIN_ROLES_KEY, roles);
}

/** Name of the action written in journal_admin, e.g. @Audit('chauffeur.valider', 'utilisateur'). */
export function Audit(action: string, cibleType: string): MethodDecorator {
  const metadata: AuditMetadata = { action, cibleType };
  return SetMetadata(AUDIT_KEY, metadata);
}

/** The signed-in back-office account (route protected by @AdminAuthenticated()). */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminAccount => context.switchToHttp().getRequest<AdminRequest>().admin,
);
