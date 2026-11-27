import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CanalOtp } from '@contract';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const OTP_CHANNELS: readonly CanalOtp[] = ['whatsapp', 'sms'];

class PhoneNumberRequest {
  @ApiProperty({ example: '034 12 345 67', description: 'Malagasy mobile number, any usual format.' })
  @IsString()
  @MaxLength(30)
  telephone!: string;
}

export class RequestOtpRequest extends PhoneNumberRequest {
  @ApiPropertyOptional({
    enum: OTP_CHANNELS,
    default: 'whatsapp',
    description: 'Channel of the code. "sms": the "Recevoir par SMS" button of the app.',
  })
  @IsOptional()
  @IsIn(OTP_CHANNELS, { message: 'Le canal doit être "whatsapp" ou "sms".' })
  canal?: CanalOtp;
}

export class VerifyOtpRequest extends PhoneNumberRequest {
  @ApiProperty({ example: '048213', description: 'The 6 digits received by WhatsApp or SMS (the newest code).' })
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres.' })
  code!: string;
}

export class RefreshTokenRequest {
  @ApiProperty({ description: 'Refresh token received at sign-in or at the last refresh.' })
  @IsString()
  @MaxLength(200)
  refreshToken!: string;
}
