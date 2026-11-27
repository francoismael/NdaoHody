import type { CanalOtp } from '@contract';
import type { NewOtpCode, OtpCode } from '../entity/OtpCode';

export abstract class OtpCodeRepository {
  /** The most recent code sent to this number, used or not. */
  abstract findLatest(telephone: string): Promise<OtpCode | null>;

  /** The most recent code sent to this number through this channel. */
  abstract findLatestByChannel(telephone: string, canal: CanalOtp): Promise<OtpCode | null>;

  abstract findByWhatsAppMessageId(whatsappMessageId: string): Promise<OtpCode | null>;

  abstract countCreatedSince(telephone: string, since: Date): Promise<number>;

  abstract create(code: NewOtpCode): Promise<OtpCode>;

  abstract setWhatsAppMessageId(id: number, whatsappMessageId: string): Promise<void>;

  abstract recordFailedAttempt(id: number): Promise<void>;

  abstract markUsed(id: number, at: Date): Promise<void>;

  /**
   * Records that the WhatsApp message was not delivered.
   * false when it was already recorded (Meta sends the same status several times).
   */
  abstract recordDeliveryFailure(id: number, at: Date): Promise<boolean>;

  /** Cancels a code neither used nor cancelled yet. false when there was nothing to cancel. */
  abstract cancel(id: number, at: Date): Promise<boolean>;
}
