import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Reservation, Trajet } from '@contract';
import { PositionRequest } from '../../application/dto/GeoRequests';
import { ManageBookingsUseCase } from '../../application/usecases/bookings/ManageBookingsUseCase';
import { ShareDriverPositionUseCase } from '../../application/usecases/tracking/ShareDriverPositionUseCase';
import { ManageTripsUseCase } from '../../application/usecases/trips/ManageTripsUseCase';
import type { User } from '../../domain/entity/User';
import { Authenticated, CurrentUser } from '../decorator/AuthenticatedDecorators';

/** The signed-in user's trips and bookings: /api/v1/me/trips, /me/reservations, /me/requests. */
@ApiTags('me')
@Authenticated()
@Controller('me')
export class MyRidesController {
  constructor(
    private readonly trips: ManageTripsUseCase,
    private readonly bookings: ManageBookingsUseCase,
    private readonly driverPosition: ShareDriverPositionUseCase,
  ) {}

  @Post('position')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'The driver’s position (same as the WebSocket "driver-position"): passengers receive "tracking-update".',
  })
  sharePosition(@CurrentUser() user: User, @Body() body: PositionRequest): Promise<void> {
    return this.driverPosition.execute(user, { latitude: body.latitude, longitude: body.longitude });
  }

  @Get('trips')
  @ApiOkResponse({ description: 'Trips published by the driver, newest departure first.' })
  myTrips(@CurrentUser() user: User): Promise<Trajet[]> {
    return this.trips.listMine(user);
  }

  @Get('trips/active')
  @ApiOkResponse({ description: 'The driver’s trip on the road, or null.' })
  activeTrip(@CurrentUser() user: User): Promise<Trajet | null> {
    return this.trips.active(user);
  }

  @Get('reservations')
  @ApiOkResponse({ description: 'Bookings of the passenger, newest first.' })
  myReservations(@CurrentUser() user: User): Promise<Reservation[]> {
    return this.bookings.listMine(user);
  }

  @Get('requests')
  @ApiOkResponse({ description: 'Requests waiting for the driver’s answer (not expired).' })
  myRequests(@CurrentUser() user: User): Promise<Reservation[]> {
    return this.bookings.listRequests(user);
  }
}
