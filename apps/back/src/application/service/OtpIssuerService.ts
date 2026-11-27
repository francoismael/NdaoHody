import { Injectable, Logger } from '@nestjs/common';
import type { CanalOtp } from '@contract';
import type { OtpCode } from '../../domain/entity/OtpCode';
import { OtpCodeRepository } from '../../domain/repository/OtpCodeRepository';
import { SettingRepository } from '../../domain/repository/SettingRepository';
import { describeError } from '../helper/bestEffort';
import { addMs, DAY_MS, MINUTE_MS } from '../helper/durations';
import { MAX_OTP_PER_DAY } from '../helper/otpRules';
import { OTP_VALIDITY_MINUTES, readSetting } from '../helper/settings';
import { RandomGenerator } from '../port/RandomGenerator';
import { SecretHasher } from '../port/SecretHasher';
import { SmsSender } from '../port/SmsSender';
import { WhatsAppSender } from '../port/WhatsAppSender';

/** A code that just left. */
export interface SentOtp {
  /** Channel actually used (SMS when Meta refused the WhatsApp message at once). */
  canal: CanalOtp;
  validityMinutes: number;
}

/**
 * Creates sign-in codes (only their hash is stored) and sends them by WhatsApp or SMS.
 * Used by POST /auth/otp and by the WhatsApp -> SMS fallback of the Meta webhook.
 */
@Injectable()
export class OtpIssuerService {
  private readonly logger = new Logger(OtpIssuerService.name);

  constructor(
    private readonly otpCodes: OtpCodeRepository,
    private readonly settings: SettingRepository,
    private readonly sms: SmsSender,
    private readonly whatsapp: WhatsAppSender,
    private readonly hasher: SecretHasher,
    private readonly random: RandomGenerator,
  ) {}

  /** Creates a new code and sends it. A WhatsApp message refused at once by Meta is replaced by an SMS code. */
  async issue(telephone: string, canal: CanalOtp, now: Date): Promise<SentOtp> {
    const validityMinutes = await readSetting(this.settings, OTP_VALIDITY_MINUTES);
    const code = this.random.otpCode();
    const otp = await this.otpCodes.create({
      telephone,
      canal,
      codeHash: this.hasher.hash(code),
      dateExpiration: addMs(now, validityMinutes * MINUTE_MS),
      dateCreation: now,
    });

    if (canal === 'sms') {
      await this.sms.send(
        telephone,
        `Ndaohody : ton code est ${code}. Il expire dans ${validityMinutes} min. Ne le donne à personne.`,
      );
      return { canal, validityMinutes };
    }

    try {
      await this.otpCodes.setWhatsAppMessageId(otp.id, await this.whatsapp.sendCode(telephone, code));
      return { canal, validityMinutes };
    } catch (error) {
      // Often a problem on our side (token, template, outage): the number is not remembered as "no WhatsApp".
      this.logger.warn(`WhatsApp refused code ${otp.id} (${describeError(error)}): sending a new code by SMS.`);
      await this.replaceBySms(otp, now);
      return { canal: 'sms', validityMinutes };
    }
  }

  /**
   * Cancels a WhatsApp code and sends a new code by SMS (the old one cannot be sent again: only its hash is kept).
   * false when the code was already used or cancelled.
   */
  async replaceBySms(otp: OtpCode, now: Date): Promise<boolean> {
    if (!(await this.otpCodes.cancel(otp.id, now))) {
      return false;
    }
    await this.issue(otp.telephone, 'sms', now);
    return true;
  }

  /** 5 codes over the last 24 h, fallbacks included. */
  async dailyLimitReached(telephone: string, now: Date): Promise<boolean> {
    return (await this.otpCodes.countCreatedSince(telephone, addMs(now, -DAY_MS))) >= MAX_OTP_PER_DAY;
  }
}
