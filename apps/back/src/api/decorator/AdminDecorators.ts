import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { ActionAdmin } from '@contract/back-office';
import { ApiErrorResponse } from '../../application/dto/ApiErrorResponse';
import type { AdminAccount } from '../../domain/entity/AdminAccount';
import { ADMIN_ACTION_KEY, AdminAccessGuard, type AdminRequest } from '../guard/AdminAccessGuard';
import { AdminJournalInterceptor, AUDIT_KEY, type AuditMetadata } from '../interceptor/AdminJournalInterceptor';

/** Put on every back-office controller: token check, permissions, read-only investisseur, journal of writes. */
export function AdminAuthenticated(): ClassDecorator & MethodDecorator {
  return applyDecorators(
    UseGuards(AdminAccessGuard),
    UseInterceptors(AdminJournalInterceptor),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ type: ApiErrorResponse, description: 'Missing, invalid or expired back-office token.' }),
    ApiForbiddenResponse({ type: ApiErrorResponse, description: 'Deactivated account, role not allowed or read-only.' }),
  );
}

/** Action needed to call a route (see ADMIN_PERMISSIONS); the roles that have it get through. */
export function AdminAction(action: ActionAdmin): ClassDecorator & MethodDecorator {
  return SetMetadata(ADMIN_ACTION_KEY, action);
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
