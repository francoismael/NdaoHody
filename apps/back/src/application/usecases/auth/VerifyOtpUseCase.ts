import { Injectable } from '@nestjs/common';
import type { OtpCode } from '../../../domain/entity/OtpCode';
import { normalizePhoneNumber } from '../../../domain/entity/PhoneNumber';
import { DomainException } from '../../../domain/exception/DomainException';
import { OtpCodeRepository } from '../../../domain/repository/OtpCodeRepository';
import { UserRepository } from '../../../domain/repository/UserRepository';
import type { SignInResponse } from '../../dto/AuthResponses';
import { toMeResponse } from '../../dto/MeResponse';
import { Clock } from '../../port/Clock';
import { SecretHasher } from '../../port/SecretHasher';
import { UnitOfWork } from '../../port/UnitOfWork';
import { assertAccountActive } from '../../helper/accountStatus';
import { SessionIssuerService } from '../../service/SessionIssuerService';
import { INVALID_PHONE_MESSAGE } from './RequestOtpUseCase';

export const MAX_OTP_ATTEMPTS = 3;

const EXPIRED_CODE_MESSAGE = 'Ce code a expiré. Demande un nouveau code.';
const TOO_MANY_ATTEMPTS_MESSAGE = "Trop d'essais avec ce code. Demande un nouveau code.";

/**
 * POST /auth/otp/verify: checks the SMS code (3 tries), creates the account
 * the first time, then opens a session.
 */
@Injectable()
export class VerifyOtpUseCase {
  constructor(
    private readonly otpCodes: OtpCodeRepository,
    private readonly users: UserRepository,
    private readonly hasher: SecretHasher,
    private readonly sessions: SessionIssuerService,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(rawPhone: string, code: string): Promise<SignInResponse> {
    const telephone = normalizePhoneNumber(rawPhone);
    if (!telephone) {
      throw new DomainException('invalid', INVALID_PHONE_MESSAGE);
    }
    const now = this.clock.now();
    const otp = await this.checkCode(await this.otpCodes.findLatest(telephone), code, now);

    // Using the code, creating the account and opening the session succeed or fail together.
    return this.unitOfWork.run(async () => {
      await this.otpCodes.markUsed(otp.id, now);

      const existingUser = await this.users.findByPhone(telephone);
      if (existingUser) {
        assertAccountActive(existingUser);
      }
      const user = existingUser ?? (await this.users.createWithVerifiedPhone(telephone, now));
      const session = await this.sessions.issue(user.id);

      return { ...session, utilisateur: toMeResponse(user), nouveau: !existingUser };
    });
  }

  /** Returns the code when it is valid; otherwise counts the failed try and throws. */
  private async checkCode(otp: OtpCode | null, code: string, now: Date): Promise<OtpCode> {
    if (!otp || otp.dateUtilisation || otp.dateExpiration <= now) {
      throw new DomainException('invalid', EXPIRED_CODE_MESSAGE);
    }
    if (otp.essais >= MAX_OTP_ATTEMPTS) {
      throw new DomainException('too_many_requests', TOO_MANY_ATTEMPTS_MESSAGE);
    }
    if (!this.hasher.matches(code, otp.codeHash)) {
      const remainingAttempts = MAX_OTP_ATTEMPTS - (otp.essais + 1);
      await this.otpCodes.recordFailedAttempt(otp.id);
      if (remainingAttempts === 0) {
        throw new DomainException('too_many_requests', TOO_MANY_ATTEMPTS_MESSAGE);
      }
      throw new DomainException('invalid', `Code incorrect. Encore ${remainingAttempts} essai(s).`, {
        remainingAttempts,
      });
    }
    return otp;
  }
}
