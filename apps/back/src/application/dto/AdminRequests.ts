import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TypeDocument } from '@contract';
import type {
  DemandeActivationCompte,
  DemandeConnexionAdmin,
  DemandeCreationCompte,
  DemandeRefus,
  DemandeRefusDossier,
} from '@contract/back-office';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { CREATABLE_ROLES } from '../../domain/entity/AdminAccount';
import { DRIVER_DOCUMENT_TYPES } from '../../domain/entity/DriverDocument';

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AdminSignInRequest implements DemandeConnexionAdmin {
  @ApiProperty({ example: 'admin@ndaohody.test' })
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @ApiProperty({ example: 'Ndaohody2026!' })
  @IsString()
  @MaxLength(200)
  motDePasse!: string;
}

export class CreateAdminAccountRequest implements DemandeCreationCompte {
  @ApiProperty({ example: 'Hery Rakoto' })
  @Transform(trim)
  @IsString()
  @Length(2, 150)
  nomComplet!: string;

  @ApiProperty({ example: 'hery@ndaohody.mg' })
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @ApiProperty({ enum: CREATABLE_ROLES })
  @IsIn(CREATABLE_ROLES)
  role!: DemandeCreationCompte['role'];
}

export class SetAdminAccountActiveRequest implements DemandeActivationCompte {
  @ApiProperty()
  @IsBoolean()
  actif!: boolean;
}

export class RejectRequest implements DemandeRefus {
  @ApiProperty({ example: 'Permis illisible', description: 'Shown to the driver.' })
  @Transform(trim)
  @IsString()
  @Length(3, 255)
  motif!: string;
}

export class RejectDriverRequest extends RejectRequest implements DemandeRefusDossier {
  @ApiPropertyOptional({ enum: DRIVER_DOCUMENT_TYPES, isArray: true, description: 'Refused documents (default: all).' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(DRIVER_DOCUMENT_TYPES, { each: true })
  documents?: TypeDocument[];
}
