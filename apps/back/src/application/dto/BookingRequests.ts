import { ApiProperty } from '@nestjs/swagger';
import type { DemandeReservation } from '@contract';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
import { PlaceRequest } from './TripRequests';
import { trimString } from '../helper/trimString';

const MAX_SEATS = 8;

/** POST /reservations. */
export class CreateBookingRequest implements DemandeReservation {
  @ApiProperty({ example: 1 })
  @IsInt()
  trajetId!: number;

  @ApiProperty({ example: 1, description: 'From 1 to all the free seats of the trip.' })
  @IsInt()
  @Min(1)
  @Max(MAX_SEATS)
  places!: number;

  @ApiProperty({ type: PlaceRequest })
  @ValidateNested()
  @Type(() => PlaceRequest)
  priseEnCharge!: PlaceRequest;

  @ApiProperty({ type: PlaceRequest })
  @ValidateNested()
  @Type(() => PlaceRequest)
  depose!: PlaceRequest;
}

/** POST /reservations/:id/refuse. */
export class RefuseBookingRequest {
  @ApiProperty({ example: 'Je ne passe plus par là', description: 'Shown to the passenger.' })
  @Transform(trimString)
  @IsString()
  @Length(3, 255)
  motif!: string;
}
