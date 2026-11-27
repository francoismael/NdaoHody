import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional, IsString, Length } from 'class-validator';
import { trimString } from '../helper/trimString';

/** GET /geo/area */
export class PositionQuery {
  @ApiProperty({ example: -18.9067 })
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 47.5253 })
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;
}

/** GET /geo/places/:id */
export class SearchSessionQuery {
  @ApiProperty({
    example: '3f6c2a1e-8b4d-4c2a-9f1e-2b7d5c8a9e10',
    description: 'Same value from the first key typed to the chosen place (Mapbox bills per session). A UUID made by the app.',
  })
  @IsString()
  @Length(8, 64)
  session!: string;
}

/** GET /geo/places */
export class SuggestPlacesQuery extends SearchSessionQuery {
  @ApiProperty({ example: 'Analakely', description: 'What the user typed (2 characters at least).' })
  @Transform(trimString)
  @IsString()
  @Length(1, 100)
  q!: string;

  @ApiPropertyOptional({ example: -18.9067, description: 'Where the user is: closer places first.' })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 47.5253 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}

/** GET /geo/route */
export class RouteQuery {
  @ApiProperty({ example: -18.985 })
  @Type(() => Number)
  @IsLatitude()
  departLatitude!: number;

  @ApiProperty({ example: 47.533 })
  @Type(() => Number)
  @IsLongitude()
  departLongitude!: number;

  @ApiProperty({ example: -18.9067 })
  @Type(() => Number)
  @IsLatitude()
  arriveeLatitude!: number;

  @ApiProperty({ example: 47.5253 })
  @Type(() => Number)
  @IsLongitude()
  arriveeLongitude!: number;
}

/** POST /me/position: the driver's position (same as the WebSocket event "driver-position"). */
export class PositionRequest extends PositionQuery {}
