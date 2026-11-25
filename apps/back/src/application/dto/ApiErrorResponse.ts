import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Body of every error returned by the API, whatever the route.
 */
export class ApiErrorResponse {
  @ApiProperty({ example: 400 })
  status!: number;

  @ApiProperty({ example: 'telephone must be a valid phone number' })
  message!: string;

  @ApiProperty({ example: '2026-11-24T10:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/auth/otp' })
  path!: string;

  @ApiPropertyOptional({ description: 'Extra information, e.g. which database is down.' })
  details?: unknown;
}
