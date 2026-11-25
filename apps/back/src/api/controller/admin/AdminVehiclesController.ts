import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RejectRequest } from '../../../application/dto/AdminRequests';
import type { VehicleView } from '../../../application/dto/AdminResponses';
import { ApiErrorResponse } from '../../../application/dto/ApiErrorResponse';
import { ReviewVehiclesUseCase } from '../../../application/usecases/admin/ReviewVehiclesUseCase';
import type { AdminAccount } from '../../../domain/entity/AdminAccount';
import { AdminAuthenticated, AdminRoles, Audit, CurrentAdmin } from '../../decorator/AdminDecorators';

/** Vehicles waiting for validation: /api/admin/vehicles/... */
@ApiTags('admin · vehicles')
@AdminAuthenticated()
@ApiNotFoundResponse({ type: ApiErrorResponse })
@ApiConflictResponse({ type: ApiErrorResponse, description: 'The vehicle is not waiting for a decision.' })
@Controller('vehicles')
export class AdminVehiclesController {
  constructor(private readonly vehicles: ReviewVehiclesUseCase) {}

  @Get('pending')
  @ApiOkResponse({ description: 'Vehicles waiting for a decision (no plate nor photo for an investisseur).' })
  listPending(@CurrentAdmin() admin: AdminAccount): Promise<VehicleView[]> {
    return this.vehicles.listPending(admin);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @AdminRoles('super_admin', 'admin')
  @Audit('vehicule.valider', 'vehicule')
  @ApiOkResponse({ description: 'Vehicle validated.' })
  approve(@CurrentAdmin() admin: AdminAccount, @Param('id', ParseIntPipe) id: number): Promise<VehicleView> {
    return this.vehicles.approve(admin, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @AdminRoles('super_admin', 'admin')
  @Audit('vehicule.refuser', 'vehicule')
  @ApiOkResponse({ description: 'Vehicle refused with a reason shown to the driver.' })
  reject(
    @CurrentAdmin() admin: AdminAccount,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RejectRequest,
  ): Promise<VehicleView> {
    return this.vehicles.reject(admin, id, body.motif);
  }
}
