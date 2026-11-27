import { Injectable } from '@nestjs/common';
import type { CanalOtp } from '@contract';
import { normalizePhoneNumber } from '../../../domain/entity/PhoneNumber';
import { DomainException } from '../../../domain/exception/DomainException';
import { OtpCodeRepository } from '../../../domain/repository/OtpCodeRepository';
import { UserRepository } from '../../../domain/repository/UserRepository';
import type { OtpSentResponse } from '../../dto/AuthResponses';
import { Clock } from '../../port/Clock';
import { assertAccountActive } from '../../helper/accountStatus';
import { addMs, DAY_MS, SECOND_MS, secondsUntil } from '../../helper/durations';
import { OTP_RESEND_DELAY_SECONDS, WHATSAPP_FAILURE_MEMORY_DAYS } from '../../helper/otpRules';
import { OtpIssuerService } from '../../service/OtpIssuerService';

export const INVALID_PHONE_MESSAGE = 'Numéro de téléphone invalide. Exemple : 034 12 345 67.';

/**
 * POST /auth/otp: sends a 6-digit sign-in code, by WhatsApp unless the app asks for SMS
 * or the last WhatsApp message to this number could not be delivered (last 30 days).
 * One code per minute and 5 codes per day at most for the same number.
 */
@Injectable()
export class RequestOtpUseCase {
  constructor(
    private readonly otpCodes: OtpCodeRepository,
    private readonly users: UserRepository,
    private readonly issuer: OtpIssuerService,
    private readonly clock: Clock,
  ) {}

  async execute(rawPhone: string, canal?: CanalOtp): Promise<OtpSentResponse> {
    const telephone = normalizePhoneNumber(rawPhone);
    if (!telephone) {
      throw new DomainException('invalid', INVALID_PHONE_MESSAGE);
    }
    const now = this.clock.now();
    await this.assertCanSend(telephone, now);

    // No code for a suspended account: it could not sign in anyway.
    const existingUser = await this.users.findByPhone(telephone);
    if (existingUser) {
      assertAccountActive(existingUser);
    }

    const sent = await this.issuer.issue(telephone, canal ?? (await this.defaultChannel(telephone, now)), now);
    return { expiresInSeconds: sent.validityMinutes * 60, resendInSeconds: OTP_RESEND_DELAY_SECONDS, canal: sent.canal };
  }

  /** WhatsApp, unless the last WhatsApp message to this number could not be delivered recently. */
  private async defaultChannel(telephone: string, now: Date): Promise<CanalOtp> {
    const failedAt = (await this.otpCodes.findLatestByChannel(telephone, 'whatsapp'))?.dateEchecLivraison;
    return failedAt && failedAt >= addMs(now, -WHATSAPP_FAILURE_MEMORY_DAYS * DAY_MS) ? 'sms' : 'whatsapp';
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

    if (await this.issuer.dailyLimitReached(telephone, now)) {
      throw new DomainException('too_many_requests', "Trop de codes demandés aujourd'hui. Réessaie demain.");
    }
  }
}
