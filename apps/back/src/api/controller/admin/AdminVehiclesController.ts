import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RejectRequest } from '../../../application/dto/AdminRequests';
import type { VehiculeEnAttente } from '@contract/back-office';
import { ApiErrorResponse } from '../../../application/dto/ApiErrorResponse';
import { ReviewVehiclesUseCase } from '../../../application/usecases/admin/ReviewVehiclesUseCase';
import { AdminAction, AdminAuthenticated, Audit } from '../../decorator/AdminDecorators';

/** Vehicles waiting for validation: /api/admin/vehicles/... */
@ApiTags('admin · vehicles')
@AdminAuthenticated()
@ApiNotFoundResponse({ type: ApiErrorResponse })
@ApiConflictResponse({ type: ApiErrorResponse, description: 'The vehicle is not waiting for a decision.' })
@Controller('vehicles')
export class AdminVehiclesController {
  constructor(private readonly vehicles: ReviewVehiclesUseCase) {}

  @Get('pending')
  @AdminAction('vehicules.voir')
  @ApiOkResponse({ description: 'Vehicles waiting for a decision.' })
  listPending(): Promise<VehiculeEnAttente[]> {
    return this.vehicles.listPending();
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @AdminAction('vehicules.decider')
  @Audit('vehicule.valider', 'vehicule')
  @ApiOkResponse({ description: 'Vehicle validated.' })
  approve(@Param('id', ParseIntPipe) id: number): Promise<VehiculeEnAttente> {
    return this.vehicles.approve(id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @AdminAction('vehicules.decider')
  @Audit('vehicule.refuser', 'vehicule')
  @ApiOkResponse({ description: 'Vehicle refused with a reason shown to the driver.' })
  reject(@Param('id', ParseIntPipe) id: number, @Body() body: RejectRequest): Promise<VehiculeEnAttente> {
    return this.vehicles.reject(id, body.motif);
  }
}
