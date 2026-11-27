import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Reservation, SuiviReservation } from '@contract';
import { ApiErrorResponse } from '../../application/dto/ApiErrorResponse';
import { CreateBookingRequest, RefuseBookingRequest } from '../../application/dto/BookingRequests';
import { AnswerBookingUseCase } from '../../application/usecases/bookings/AnswerBookingUseCase';
import { ManageBookingsUseCase } from '../../application/usecases/bookings/ManageBookingsUseCase';
import { RequestBookingUseCase } from '../../application/usecases/bookings/RequestBookingUseCase';
import { ManageRideUseCase } from '../../application/usecases/rides/ManageRideUseCase';
import { GetTrackingUseCase } from '../../application/usecases/tracking/GetTrackingUseCase';
import type { User } from '../../domain/entity/User';
import { Authenticated, CurrentUser } from '../decorator/AuthenticatedDecorators';

/** Seat requests: /api/v1/reservations/... */
@ApiTags('bookings')
@Authenticated()
@ApiBadRequestResponse({ type: ApiErrorResponse })
@ApiConflictResponse({ type: ApiErrorResponse })
@ApiNotFoundResponse({ type: ApiErrorResponse })
@Controller('reservations')
export class BookingsController {
  constructor(
    private readonly requestBooking: RequestBookingUseCase,
    private readonly answerBooking: AnswerBookingUseCase,
    private readonly bookings: ManageBookingsUseCase,
    private readonly tracking: GetTrackingUseCase,
    private readonly ride: ManageRideUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({ description: 'Request sent: waiting for the driver (3 min). Price computed by the server.' })
  @ApiForbiddenResponse({ type: ApiErrorResponse, description: 'Women-only trip, or blocked user.' })
  create(@CurrentUser() user: User, @Body() body: CreateBookingRequest): Promise<Reservation> {
    return this.requestBooking.create(user, body);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'The booking (passenger or driver of the trip only).' })
  get(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Reservation> {
    return this.bookings.get(user, id);
  }

  @Get(':id/tracking')
  @ApiOkResponse({ description: 'Tracking screen (SuiviReservation): driver position, road to the pickup point, minutes. After acceptance.' })
  track(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<SuiviReservation> {
    return this.tracking.execute(user, id);
  }

  @Get(':id/refusal-reason')
  @ApiOkResponse({ description: '{ motif } given by the driver when he refused.' })
  refusalReason(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<{ motif: string | null }> {
    return this.bookings.refusalReason(user, id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Accepted by the driver: seats taken, chat opened.' })
  accept(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Reservation> {
    return this.answerBooking.accept(user, id);
  }

  @Post(':id/refuse')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Refused by the driver, with a reason shown to the passenger.' })
  refuse(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number, @Body() body: RefuseBookingRequest): Promise<Reservation> {
    return this.answerBooking.refuse(user, id, body.motif);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'New request to the same driver after an expired one (2 times at most).' })
  retry(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Reservation> {
    return this.requestBooking.retry(user, id);
  }

  @Post(':id/on-site')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Driver: "Je suis sur place" (within 500 m, checked by the server). The passenger has 10 min.' })
  onSite(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Reservation> {
    return this.ride.onSite(user, id);
  }

  @Post(':id/extend-wait')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Driver, after the 10 min: waits 10 more minutes.' })
  extendWait(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Reservation> {
    return this.ride.extendWait(user, id);
  }

  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Driver, after the 10 min: the passenger is absent; seats given back, absence counted.' })
  noShow(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Reservation> {
    return this.ride.noShow(user, id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Driver: the passenger is on board; the trip is "en_cours".' })
  start(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Reservation> {
    return this.ride.start(user, id);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Driver: this ride is over; the passenger is asked to rate the driver.' })
  finish(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Reservation> {
    return this.ride.finish(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Cancelled by the passenger or the driver before boarding; seats given back.' })
  cancel(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number): Promise<Reservation> {
    return this.bookings.cancel(user, id);
  }
}
