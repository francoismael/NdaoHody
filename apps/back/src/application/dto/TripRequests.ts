import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DemandePublicationTrajet, DemandeRecherche, Lieu, TypeTrajet } from '@contract';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { trimString } from '../helper/trimString';

const TRIP_TYPES: readonly TypeTrajet[] = ['immediat', 'a_l_avance'];
const MAX_SEATS = 8;

/** A place: its name and coordinates (data object Lieu). */
export class PlaceRequest implements Lieu {
  @ApiProperty({ example: 'Tanjombato, arrêt Jumbo' })
  @Transform(trimString)
  @IsString()
  @Length(1, 150)
  libelle!: string;

  @ApiProperty({ example: -18.96 })
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 47.528 })
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;
}

/** POST /trips. The road, its distance and duration are computed by the server. */
export class PublishTripRequest implements DemandePublicationTrajet {
  @ApiProperty({ enum: TRIP_TYPES, description: 'immediat: leaves now. a_l_avance: date + time in dateDepart.' })
  @IsIn(TRIP_TYPES)
  type!: TypeTrajet;

  @ApiProperty({ type: PlaceRequest })
  @ValidateNested()
  @Type(() => PlaceRequest)
  depart!: PlaceRequest;

  @ApiProperty({ type: PlaceRequest })
  @ValidateNested()
  @Type(() => PlaceRequest)
  arrivee!: PlaceRequest;

  @ApiProperty({ example: 3, description: 'Seats offered (at most the seats of the vehicle).' })
  @IsInt()
  @Min(1)
  @Max(MAX_SEATS)
  placesTotal!: number;

  @ApiPropertyOptional({ example: 1, description: 'Required when the driver has several validated vehicles; with only one, it is used.' })
  @IsOptional()
  @IsInt()
  vehiculeId?: number;

  @ApiPropertyOptional({ example: '2026-11-28T07:30:00+03:00', description: 'Required for a_l_avance; at most 15 days ahead.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  dateDepart?: string;

  @ApiPropertyOptional({ description: 'Women only (a woman driver only). Default: false.' })
  @IsOptional()
  @IsBoolean()
  reserveFemmes?: boolean;
}

/** PATCH /trips/:id, before departure. Passengers are told. */
export class UpdateTripRequest {
  @ApiPropertyOptional({ example: '2026-11-28T08:00:00+03:00' })
  @IsOptional()
  @IsISO8601({ strict: true })
  dateDepart?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_SEATS)
  placesTotal?: number;
}

/** POST /trips/search (data object DemandeRecherche). */
export class SearchTripsRequest implements DemandeRecherche {
  @ApiProperty({ type: PlaceRequest, description: 'Where the passenger gets in.' })
  @ValidateNested()
  @Type(() => PlaceRequest)
  depart!: PlaceRequest;

  @ApiProperty({ type: PlaceRequest, description: 'Where the passenger gets out.' })
  @ValidateNested()
  @Type(() => PlaceRequest)
  destination!: PlaceRequest;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(MAX_SEATS)
  places!: number;

  @ApiProperty({ example: 'maintenant', description: '"maintenant", or an ISO date for later.' })
  @IsString()
  @Length(1, 40)
  quand!: string;

  @ApiPropertyOptional({ description: 'A woman can ask to see women-only trips only.' })
  @IsOptional()
  @IsBoolean()
  femmesSeulement?: boolean;
}
