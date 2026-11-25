import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Administrateur } from '@contract';
import { AdminSignInRequest } from '../../../application/dto/AdminRequests';
import type { AdminSignInResponse } from '../../../application/dto/AdminResponses';
import { ApiErrorResponse } from '../../../application/dto/ApiErrorResponse';
import { AdminSignInUseCase } from '../../../application/usecases/admin/AdminSignInUseCase';
import { toAdministrateur, type AdminAccount } from '../../../domain/entity/AdminAccount';
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
  @ApiOkResponse({ description: 'Signed in: back-office token (8 h) and account.' })
  @ApiUnauthorizedResponse({ type: ApiErrorResponse, description: 'Wrong e-mail or password.' })
  @ApiForbiddenResponse({ type: ApiErrorResponse, description: 'Deactivated account.' })
  @ApiTooManyRequestsResponse({ type: ApiErrorResponse, description: 'Locked for 15 min after 5 wrong passwords.' })
  login(@Body() body: AdminSignInRequest): Promise<AdminSignInResponse> {
    return this.signIn.execute(body.email, body.motDePasse);
  }

  @Get('me')
  @AdminAuthenticated()
  @ApiOkResponse({ description: 'The signed-in back-office account.' })
  me(@CurrentAdmin() admin: AdminAccount): Administrateur {
    return toAdministrateur(admin);
  }
}
