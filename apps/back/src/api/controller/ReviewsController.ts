import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Avis, AvisAvecAuteur, ProfilChauffeurPublic, ProfilPublic } from '@contract';
import { ApiErrorResponse } from '../../application/dto/ApiErrorResponse';
import { CreateReviewRequest } from '../../application/dto/BookingRequests';
import { PublicProfilesUseCase } from '../../application/usecases/reviews/PublicProfilesUseCase';
import { ReviewsUseCase } from '../../application/usecases/reviews/ReviewsUseCase';
import type { User } from '../../domain/entity/User';
import { Authenticated, CurrentUser } from '../decorator/AuthenticatedDecorators';

/** Reviews and public profiles: /api/v1/reviews, /api/v1/users/:id/..., /api/v1/drivers/:id/public */
@ApiTags('reviews')
@Authenticated()
@Controller()
export class ReviewsController {
  constructor(
    private readonly reviews: ReviewsUseCase,
    private readonly profiles: PublicProfilesUseCase,
  ) {}

  @Post('reviews')
  @ApiCreatedResponse({ description: 'The passenger rated his driver (once, after a finished ride).' })
  @ApiForbiddenResponse({ type: ApiErrorResponse, description: 'Not the passenger of this ride.' })
  @ApiConflictResponse({ type: ApiErrorResponse, description: 'Ride not finished, or already rated.' })
  create(@CurrentUser() user: User, @Body() body: CreateReviewRequest): Promise<Avis> {
    return this.reviews.create(user, body);
  }

  @Get('users/:id/reviews')
  @ApiOkResponse({ description: 'Reviews received, newest first, with the first name and photo of each author.' })
  received(@Param('id', ParseIntPipe) id: number): Promise<AvisAvecAuteur[]> {
    return this.reviews.listReceived(id);
  }

  @Get('users/:id/public')
  @ApiOkResponse({ description: 'Public profile (never the phone number).' })
  userProfile(@Param('id', ParseIntPipe) id: number): Promise<ProfilPublic> {
    return this.profiles.user(id);
  }

  @Get('drivers/:id/public')
  @ApiOkResponse({ description: 'Driver public profile: rating, rides, default vehicle.' })
  driverProfile(@Param('id', ParseIntPipe) id: number): Promise<ProfilChauffeurPublic> {
    return this.profiles.driver(id);
  }
}
