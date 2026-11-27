/** Sign-in code rules shared by the request and the WhatsApp -> SMS fallback. */

/** A new code can be asked this long after the previous one. */
export const OTP_RESEND_DELAY_SECONDS = 60;
/** Codes sent to one number over 24 h, fallbacks included. */
export const MAX_OTP_PER_DAY = 5;
/** After a WhatsApp message that could not be delivered, the number gets its codes by SMS for this long. */
export const WHATSAPP_FAILURE_MEMORY_DAYS = 30;
