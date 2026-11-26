import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RejectDriverRequest } from '../../../application/dto/AdminRequests';
import type { DossierChauffeur } from '@contract/back-office';
import { ApiErrorResponse } from '../../../application/dto/ApiErrorResponse';
import { ReviewDriverApplicationsUseCase } from '../../../application/usecases/admin/ReviewDriverApplicationsUseCase';
import type { AdminAccount } from '../../../domain/entity/AdminAccount';
import { AdminAction, AdminAuthenticated, Audit, CurrentAdmin } from '../../decorator/AdminDecorators';

/** Driver applications: /api/admin/drivers/... */
@ApiTags('admin · drivers')
@AdminAuthenticated()
@ApiNotFoundResponse({ type: ApiErrorResponse })
@ApiConflictResponse({ type: ApiErrorResponse, description: 'The application is not waiting for a decision.' })
@Controller('drivers')
export class AdminDriversController {
  constructor(private readonly applications: ReviewDriverApplicationsUseCase) {}

  @Get('applications')
  @AdminAction('chauffeurs.dossiers.voir')
  @ApiOkResponse({ description: 'Applications waiting for a decision.' })
  listPending(): Promise<DossierChauffeur[]> {
    return this.applications.listPending();
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @AdminAction('chauffeurs.dossiers.decider')
  @Audit('chauffeur.valider', 'utilisateur')
  @ApiOkResponse({ description: 'The user is now a validated driver.' })
  approve(@CurrentAdmin() admin: AdminAccount, @Param('id', ParseIntPipe) id: number): Promise<DossierChauffeur> {
    return this.applications.approve(admin, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @AdminAction('chauffeurs.dossiers.decider')
  @Audit('chauffeur.refuser', 'utilisateur')
  @ApiOkResponse({ description: 'Documents refused with a reason shown to the driver.' })
  reject(
    @CurrentAdmin() admin: AdminAccount,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RejectDriverRequest,
  ): Promise<DossierChauffeur> {
    return this.applications.reject(admin, id, body);
  }
}
