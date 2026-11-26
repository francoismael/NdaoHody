import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CompteAdminConnecte, ConnexionAdmin } from '@contract/back-office';
import { AdminSignInRequest } from '../../../application/dto/AdminRequests';
import { ApiErrorResponse } from '../../../application/dto/ApiErrorResponse';
import { AdminSignInUseCase } from '../../../application/usecases/admin/AdminSignInUseCase';
import { toAdministrateur, type AdminAccount } from '../../../domain/entity/AdminAccount';
import { permissionsOf } from '../../../domain/entity/adminPermissions';
import { AdminAuthenticated, CurrentAdmin } from '../../decorator/AdminDecorators';

/** Per IP address; the lock after 5 wrong passwords is per account (AdminSignInUseCase). */
const SIGN_IN_LIMIT = { default: { limit: 10, ttl: 60_000 } };

/** Back-office sign-in: /api/admin/auth/... */
@ApiTags('admin · auth')
@Controller('auth')
export class AdminAuthController {
  constructor(private readonly signIn: AdminSignInUseCase) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(SIGN_IN_LIMIT)
  @ApiOkResponse({ description: 'Signed in: back-office token (8 h), account and permissions.' })
  @ApiUnauthorizedResponse({ type: ApiErrorResponse, description: 'Wrong e-mail or password.' })
  @ApiForbiddenResponse({ type: ApiErrorResponse, description: 'Deactivated account.' })
  @ApiTooManyRequestsResponse({ type: ApiErrorResponse, description: 'Locked for 15 min after 5 wrong passwords.' })
  login(@Body() body: AdminSignInRequest): Promise<ConnexionAdmin> {
    return this.signIn.execute(body.email, body.motDePasse);
  }

  @Get('me')
  @AdminAuthenticated()
  @ApiOkResponse({ description: 'The signed-in back-office account and what it may do (permissions).' })
  me(@CurrentAdmin() admin: AdminAccount): CompteAdminConnecte {
    return { administrateur: toAdministrateur(admin), permissions: permissionsOf(admin.role) };
  }
}
