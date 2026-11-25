/** Port: sends an SMS. The adapter is chosen with SMS_PROVIDER. */
export abstract class SmsSender {
  abstract send(telephone: string, message: string): Promise<void>;
}
