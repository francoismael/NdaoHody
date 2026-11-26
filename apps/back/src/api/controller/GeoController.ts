import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Lieu } from '@contract';
import { ApiErrorResponse } from '../../application/dto/ApiErrorResponse';
import { PositionQuery, RouteQuery, SearchSessionQuery, SuggestPlacesQuery } from '../../application/dto/GeoRequests';
import type { AreaNameResponse, RoutePreviewResponse } from '../../application/dto/GeoResponses';
import type { PlaceSuggestion } from '../../application/port/PlaceSearch';
import { PreviewRouteUseCase } from '../../application/usecases/geo/PreviewRouteUseCase';
import { SearchPlacesUseCase } from '../../application/usecases/geo/SearchPlacesUseCase';
import { Authenticated } from '../decorator/AuthenticatedDecorators';

/**
 * Maps for the app: /api/v1/geo/...
 * The server calls Mapbox with its own key: the app never needs Mapbox for routes or place names.
 */
@ApiTags('geo')
@Authenticated()
@ApiBadRequestResponse({ type: ApiErrorResponse, description: 'Point outside Madagascar or invalid parameters.' })
@ApiServiceUnavailableResponse({ type: ApiErrorResponse, description: 'The map service does not answer.' })
@Controller('geo')
export class GeoController {
  constructor(
    private readonly places: SearchPlacesUseCase,
    private readonly routes: PreviewRouteUseCase,
  ) {}

  @Get('places')
  @ApiOkResponse({ description: 'Up to 6 suggestions { id, nom, detail }, nearest first.' })
  suggest(@Query() query: SuggestPlacesQuery): Promise<PlaceSuggestion[]> {
    const near = query.latitude !== undefined && query.longitude !== undefined
      ? { latitude: query.latitude, longitude: query.longitude }
      : null;
    return this.places.suggest(query.q, query.session, near);
  }

  @Get('places/:id')
  @ApiOkResponse({ description: 'The chosen place (Lieu): name and coordinates.' })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  retrieve(@Param('id') id: string, @Query() query: SearchSessionQuery): Promise<Lieu> {
    return this.places.retrieve(id, query.session);
  }

  @Get('area')
  @ApiOkResponse({ description: 'Name of the area at a point touched on the map ({ libelle }, null if unknown).' })
  area(@Query() query: PositionQuery): Promise<AreaNameResponse> {
    return this.places.areaName({ latitude: query.latitude, longitude: query.longitude });
  }

  @Get('route')
  @ApiOkResponse({ description: 'Road path, distance (m), duration (s), and both points moved onto the road.' })
  route(@Query() query: RouteQuery): Promise<RoutePreviewResponse> {
    return this.routes.execute(
      { latitude: query.departLatitude, longitude: query.departLongitude },
      { latitude: query.arriveeLatitude, longitude: query.arriveeLongitude },
    );
  }
}
