import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Mode, Sexe } from '@contract';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { DEVICE_PLATFORMS, type DevicePlatform } from '../port/DeviceRegistry';

const SEXES: readonly Sexe[] = ['homme', 'femme'];
const MODES: readonly Mode[] = ['passager', 'chauffeur'];

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** PATCH /me. Last name, first name and sex become required once together (see UpdateProfileUseCase). */
export class UpdateProfileRequest {
  @ApiPropertyOptional({ example: 'Rakoto' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  nom?: string;

  @ApiPropertyOptional({ example: 'Hery' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  prenom?: string;

  @ApiPropertyOptional({ enum: SEXES })
  @IsOptional()
  @IsIn(SEXES)
  sexe?: Sexe;
}

export class SwitchModeRequest {
  @ApiProperty({ enum: MODES })
  @IsIn(MODES)
  mode!: Mode;
}

export class UnregisterDeviceRequest {
  @ApiProperty({ description: 'FCM token of the phone.' })
  @IsString()
  @MaxLength(4096)
  jeton!: string;
}

export class RegisterDeviceRequest extends UnregisterDeviceRequest {
  @ApiProperty({ enum: DEVICE_PLATFORMS })
  @IsIn(DEVICE_PLATFORMS)
  plateforme!: DevicePlatform;
}
