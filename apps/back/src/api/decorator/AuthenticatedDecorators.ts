import { applyDecorators, createParamDecorator, ExecutionContext, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiErrorResponse } from '../../application/dto/ApiErrorResponse';
import type { User } from '../../domain/entity/User';
import type { AuthenticatedRequest } from '../guard/bearerToken';
import { AccessTokenGuard } from '../guard/AccessTokenGuard';

/** Put on every controller of the app that needs a signed-in user. */
export function Authenticated(): ClassDecorator & MethodDecorator {
  return applyDecorators(
    UseGuards(AccessTokenGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ type: ApiErrorResponse, description: 'Missing, invalid or expired access token.' }),
    ApiForbiddenResponse({ type: ApiErrorResponse, description: 'Suspended account.' }),
  );
}

/** The signed-in user (route protected by @Authenticated()). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
