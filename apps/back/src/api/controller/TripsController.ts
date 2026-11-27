import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { ResultatRecherche, Trajet } from '@contract';
import { ApiErrorResponse } from '../../application/dto/ApiErrorResponse';
import { PublishTripRequest, SearchTripsRequest, UpdateTripRequest } from '../../application/dto/TripRequests';
import { ManageTripsUseCase } from '../../application/usecases/trips/ManageTripsUseCase';
import { PublishTripUseCase } from '../../application/usecases/trips/PublishTripUseCase';
import { SearchTripsUseCase } from '../../application/usecases/trips/SearchTripsUseCase';
import type { User } from '../../domain/entity/User';
import { Authenticated, CurrentUser } from '../decorator/AuthenticatedDecorators';

/** Trips: /api/v1/trips/... */
@ApiTags('trips')
@Authenticated()
@ApiBadRequestResponse({ type: ApiErrorResponse })
@ApiConflictResponse({ type: ApiErrorResponse })
@Controller('trips')
export class TripsController {
  constructor(
    private readonly publishTrip: PublishTripUseCase,
    private readonly searchTrips: SearchTripsUseCase,
    private readonly trips: ManageTripsUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({ description: 'Trip published with the road computed by the server (Trajet).' })
  @ApiForbiddenResponse({ type: ApiErrorResponse, description: 'Driver or vehicle not validated; women-only by a man.' })
  @ApiServiceUnavailableResponse({ type: ApiErrorResponse, description: 'The map service does not answer.' })
  publish(@CurrentUser() user: User, @Body() body: PublishTripRequest): Promise<Trajet> {
    return this.publishTrip.execute(user, body);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Drivers passing on the way (ResultatRecherche[]), rated first; price per seat and total.' })
  search(@CurrentUser() user: User, @Body() body: SearchTripsRequest): Promise<ResultatRecherche[]> {
    return this.searchTrips.execute(user, body);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'The trip (Trajet).' })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  get(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Trajet> {
    return this.trips.get(user, id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: '"Je pars": the planned trip is on the road.' })
  start(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Trajet> {
    return this.trips.start(user, id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Trip changed before departure; passengers are told.' })
  update(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateTripRequest): Promise<Trajet> {
    return this.trips.update(user, id, body);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Trip finished at destination (every ride finished or cancelled first); the driver goes offline.' })
  finish(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Trajet> {
    return this.trips.finish(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Trip cancelled; requests and seats cancelled, passengers told.' })
  cancel(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Trajet> {
    return this.trips.cancel(user, id);
  }
}
