import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Administrateur } from '@contract';
import { CreateAdminAccountRequest, SetAdminAccountActiveRequest } from '../../../application/dto/AdminRequests';
import type { AdminAccountWithPasswordResponse } from '../../../application/dto/AdminResponses';
import { ApiErrorResponse } from '../../../application/dto/ApiErrorResponse';
import { ManageAdminAccountsUseCase } from '../../../application/usecases/admin/ManageAdminAccountsUseCase';
import type { AdminAccount } from '../../../domain/entity/AdminAccount';
import { AdminAuthenticated, AdminRoles, Audit, CurrentAdmin } from '../../decorator/AdminDecorators';

/** Back-office accounts, super admin only: /api/admin/accounts/... */
@ApiTags('admin · accounts')
@AdminAuthenticated()
@AdminRoles('super_admin')
@ApiNotFoundResponse({ type: ApiErrorResponse })
@Controller('accounts')
export class AdminAccountsController {
  constructor(private readonly accounts: ManageAdminAccountsUseCase) {}

  @Get()
  @ApiOkResponse({ description: 'Every back-office account, newest first.' })
  list(): Promise<Administrateur[]> {
    return this.accounts.list();
  }

  @Post()
  @Audit('compte.creer', 'administrateur')
  @ApiCreatedResponse({ description: 'Account created; its temporary password is shown only in this answer.' })
  @ApiConflictResponse({ type: ApiErrorResponse, description: 'E-mail already used.' })
  create(@CurrentAdmin() admin: AdminAccount, @Body() body: CreateAdminAccountRequest): Promise<AdminAccountWithPasswordResponse> {
    return this.accounts.create(admin, body);
  }

  @Patch(':id/active')
  @Audit('compte.activation', 'administrateur')
  @ApiOkResponse({ description: 'Account enabled or disabled (a disabled account loses access at once).' })
  setActive(@Param('id', ParseIntPipe) id: number, @Body() body: SetAdminAccountActiveRequest): Promise<Administrateur> {
    return this.accounts.setActive(id, body.actif);
  }

  @Post(':id/reset-password')
  @Audit('compte.reinitialiser_mot_de_passe', 'administrateur')
  @ApiOkResponse({ description: 'New temporary password (the account is also unlocked).' })
  resetPassword(@Param('id', ParseIntPipe) id: number): Promise<AdminAccountWithPasswordResponse> {
    return this.accounts.resetPassword(id);
  }
}
