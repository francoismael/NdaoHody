import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class RequestOtpRequest {
  @ApiProperty({ example: '034 12 345 67', description: 'Malagasy mobile number, any usual format.' })
  @IsString()
  @MaxLength(30)
  telephone!: string;
}

export class VerifyOtpRequest extends RequestOtpRequest {
  @ApiProperty({ example: '048213', description: 'The 6 digits received by SMS.' })
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres.' })
  code!: string;
}

export class RefreshTokenRequest {
  @ApiProperty({ description: 'Refresh token received at sign-in or at the last refresh.' })
  @IsString()
  @MaxLength(200)
  refreshToken!: string;
}
