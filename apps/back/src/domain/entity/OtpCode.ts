import type { CanalOtp } from '@contract';

/** A sign-in code sent by WhatsApp or SMS (table code_otp). Only the hash of the code is stored. */
export interface OtpCode {
  id: number;
  telephone: string;
  codeHash: string;
  /** Wrong codes typed so far. */
  essais: number;
  canal: CanalOtp;
  /** Id of the WhatsApp message (Meta), to find the code back when its delivery fails. */
  whatsappMessageId: string | null;
  dateExpiration: Date;
  dateUtilisation: Date | null;
  /** The code was replaced by an SMS code: it is no longer accepted. */
  dateAnnulation: Date | null;
  /** Meta could not deliver the WhatsApp message. */
  dateEchecLivraison: Date | null;
  dateCreation: Date;
}

export type NewOtpCode = Pick<OtpCode, 'telephone' | 'codeHash' | 'canal' | 'dateExpiration' | 'dateCreation'>;
