import { Injectable } from '@nestjs/common';
import { normalizePhoneNumber } from '../../../domain/entity/PhoneNumber';
import { DomainException } from '../../../domain/exception/DomainException';
import { OtpCodeRepository } from '../../../domain/repository/OtpCodeRepository';
import { SettingRepository } from '../../../domain/repository/SettingRepository';
import { UserRepository } from '../../../domain/repository/UserRepository';
import type { OtpSentResponse } from '../../dto/AuthResponses';
import { Clock } from '../../port/Clock';
import { RandomGenerator } from '../../port/RandomGenerator';
import { SecretHasher } from '../../port/SecretHasher';
import { SmsSender } from '../../port/SmsSender';
import { assertAccountActive } from '../../helper/accountStatus';
import { addMs, DAY_MS, MINUTE_MS, SECOND_MS, secondsUntil } from '../../helper/durations';

export const OTP_RESEND_DELAY_SECONDS = 60;
export const MAX_OTP_PER_DAY = 5;
/** Used when the setting otp_duree_minutes is missing. */
export const DEFAULT_OTP_VALIDITY_MINUTES = 5;
export const OTP_VALIDITY_SETTING = 'otp_duree_minutes';

export const INVALID_PHONE_MESSAGE = 'Numéro de téléphone invalide. Exemple : 034 12 345 67.';

/**
 * POST /auth/otp: sends a 6-digit sign-in code by SMS.
 * One code per minute and 5 codes per day at most for the same number.
 */
@Injectable()
export class RequestOtpUseCase {
  constructor(
    private readonly otpCodes: OtpCodeRepository,
    private readonly users: UserRepository,
    private readonly settings: SettingRepository,
    private readonly sms: SmsSender,
    private readonly hasher: SecretHasher,
    private readonly random: RandomGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(rawPhone: string): Promise<OtpSentResponse> {
    const telephone = normalizePhoneNumber(rawPhone);
    if (!telephone) {
      throw new DomainException('invalid', INVALID_PHONE_MESSAGE);
    }
    const now = this.clock.now();
    await this.assertCanSend(telephone, now);

    // No SMS for a suspended account: it could not sign in anyway.
    const existingUser = await this.users.findByPhone(telephone);
    if (existingUser) {
      assertAccountActive(existingUser);
    }

    const validityMinutes = (await this.settings.findNumber(OTP_VALIDITY_SETTING)) ?? DEFAULT_OTP_VALIDITY_MINUTES;
    const code = this.random.otpCode();
    await this.otpCodes.create({
      telephone,
      codeHash: this.hasher.hash(code),
      dateExpiration: addMs(now, validityMinutes * MINUTE_MS),
      dateCreation: now,
    });
    await this.sms.send(
      telephone,
      `Ndaohody : ton code est ${code}. Il expire dans ${validityMinutes} min. Ne le donne à personne.`,
    );

    return { expiresInSeconds: validityMinutes * 60, resendInSeconds: OTP_RESEND_DELAY_SECONDS };
  }

  private async assertCanSend(telephone: string, now: Date): Promise<void> {
    const latest = await this.otpCodes.findLatest(telephone);
    if (latest) {
      const resendAt = addMs(latest.dateCreation, OTP_RESEND_DELAY_SECONDS * SECOND_MS);
      if (resendAt > now) {
        const retryInSeconds = secondsUntil(now, resendAt);
        throw new DomainException(
          'too_many_requests',
          `Un code vient d'être envoyé. Réessaie dans ${retryInSeconds} s.`,
          { retryInSeconds },
        );
      }
    }

    const sentToday = await this.otpCodes.countCreatedSince(telephone, addMs(now, -DAY_MS));
    if (sentToday >= MAX_OTP_PER_DAY) {
      throw new DomainException('too_many_requests', "Trop de codes demandés aujourd'hui. Réessaie demain.");
    }
  }
}
