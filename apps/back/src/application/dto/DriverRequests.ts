import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TypeDocument, TypeVehicule } from '@contract';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { DRIVER_DOCUMENT_TYPES } from '../../domain/entity/DriverDocument';

const VEHICLE_TYPES: readonly TypeVehicule[] = ['moto', 'voiture'];

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** POST /me/documents (multipart/form-data, with the picture in "fichier"). */
export class SubmitDocumentRequest {
  @ApiProperty({ enum: DRIVER_DOCUMENT_TYPES, description: 'Send permis_recto first.' })
  @IsIn(DRIVER_DOCUMENT_TYPES)
  type!: TypeDocument;

  @ApiPropertyOptional({ example: 'AB123456', description: 'Required with permis_recto: number printed on the licence.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  numeroPermis?: string;
}

/** POST /me/vehicles (multipart/form-data, with the picture in "photo"). */
export class AddVehicleRequest {
  @ApiProperty({ enum: VEHICLE_TYPES })
  @IsIn(VEHICLE_TYPES)
  type!: TypeVehicule;

  @ApiPropertyOptional({ example: 'Toyota' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  marque?: string;

  @ApiPropertyOptional({ example: 'Corolla' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  modele?: string;

  @ApiProperty({ example: 'Gris' })
  @Transform(trim)
  @IsString()
  @Length(1, 30)
  couleur!: string;

  @ApiProperty({ example: '1234 TBA' })
  @IsString()
  @MaxLength(20)
  immatriculation!: string;

  @ApiProperty({ example: 4, description: 'Motorbike: 1. Car: 1 to 8.' })
  @Type(() => Number)
  @IsInt()
  places!: number;
}

/** PATCH /me/vehicles/:id. Changing the description of a validated vehicle sends it back to the admins. */
export class UpdateVehicleRequest {
  @ApiPropertyOptional({ example: 'Toyota' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  marque?: string;

  @ApiPropertyOptional({ example: 'Corolla' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  modele?: string;

  @ApiPropertyOptional({ example: 'Gris' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 30)
  couleur?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  places?: number;

  @ApiPropertyOptional({ description: 'true: this vehicle becomes the default one.' })
  @IsOptional()
  @IsBoolean()
  parDefaut?: boolean;
}
