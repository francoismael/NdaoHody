import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiErrorResponse } from '../../application/dto/ApiErrorResponse';
import { RefreshTokenRequest, RequestOtpRequest, VerifyOtpRequest } from '../../application/dto/AuthRequests';
import type { OtpSentResponse, RefreshResponse, SignInResponse } from '../../application/dto/AuthResponses';
import { RefreshSessionUseCase } from '../../application/usecases/auth/RefreshSessionUseCase';
import { RequestOtpUseCase } from '../../application/usecases/auth/RequestOtpUseCase';
import { SignOutUseCase } from '../../application/usecases/auth/SignOutUseCase';
import { VerifyOtpUseCase } from '../../application/usecases/auth/VerifyOtpUseCase';

/**
 * Strict limits per IP address on the sign-in code routes (no account yet).
 * The limits per phone number (1 code per minute, 5 per day, 3 tries per code) are in the use cases.
 */
const SEND_CODE_LIMIT = { default: { limit: 5, ttl: 60_000 } };
const VERIFY_CODE_LIMIT = { default: { limit: 10, ttl: 60_000 } };

/** Sign-in with a code sent by WhatsApp or SMS: /api/v1/auth/... */
@ApiTags('auth')
@ApiBadRequestResponse({ type: ApiErrorResponse })
@ApiTooManyRequestsResponse({ type: ApiErrorResponse })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly requestOtp: RequestOtpUseCase,
    private readonly verifyOtp: VerifyOtpUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly signOut: SignOutUseCase,
  ) {}

  @Post('otp')
  @HttpCode(HttpStatus.OK)
  @Throttle(SEND_CODE_LIMIT)
  @ApiOkResponse({
    description: 'Code sent. "canal": channel actually used ("whatsapp" or "sms").',
    schema: { example: { expiresInSeconds: 300, resendInSeconds: 60, canal: 'whatsapp' } },
  })
  @ApiForbiddenResponse({ type: ApiErrorResponse, description: 'Suspended account.' })
  sendCode(@Body() body: RequestOtpRequest): Promise<OtpSentResponse> {
    return this.requestOtp.execute(body.telephone, body.canal);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle(VERIFY_CODE_LIMIT)
  @ApiOkResponse({ description: 'Signed in. "nouveau": true when the account was just created.' })
  @ApiForbiddenResponse({ type: ApiErrorResponse, description: 'Suspended account.' })
  verifyCode(@Body() body: VerifyOtpRequest): Promise<SignInResponse> {
    return this.verifyOtp.execute(body.telephone, body.code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'New tokens. The refresh token sent no longer works.' })
  @ApiUnauthorizedResponse({ type: ApiErrorResponse, description: 'Unknown, used or expired refresh token.' })
  refresh(@Body() body: RefreshTokenRequest): Promise<RefreshResponse> {
    return this.refreshSession.execute(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Session closed on this phone.' })
  logout(@Body() body: RefreshTokenRequest): Promise<void> {
    return this.signOut.execute(body.refreshToken);
  }
}
