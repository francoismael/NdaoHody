/** Port: sends a sign-in code on WhatsApp. The adapter is chosen with WHATSAPP_PROVIDER. */
export abstract class WhatsAppSender {
  /**
   * Sends the code through the approved authentication template (the code is a template parameter,
   * not free text). Returns the id of the WhatsApp message; throws when Meta refuses the message.
   */
  abstract sendCode(telephone: string, code: string): Promise<string>;
}
