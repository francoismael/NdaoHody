import { isRecord, text } from './json';

/** The delivery status of one WhatsApp message, as sent by Meta to the webhook. */
export interface WhatsAppMessageStatus {
  messageId: string;
  /** "sent", "delivered", "read", "failed"... */
  status: string;
}

/**
 * Reads the statuses of a Meta webhook payload:
 * { entry: [{ changes: [{ field: "messages", value: { statuses: [{ id, status }] } }] }] }.
 * Malformed parts are skipped (the payload comes from outside).
 */
export function readWhatsAppStatuses(payload: unknown): WhatsAppMessageStatus[] {
  const statuses: WhatsAppMessageStatus[] = [];
  for (const entry of arrayAt(payload, 'entry')) {
    for (const change of arrayAt(entry, 'changes')) {
      const value = isRecord(change) ? change['value'] : undefined;
      for (const item of arrayAt(value, 'statuses')) {
        const messageId = isRecord(item) ? text(item['id']) : null;
        const status = isRecord(item) ? text(item['status']) : null;
        if (messageId && status) {
          statuses.push({ messageId, status });
        }
      }
    }
  }
  return statuses;
}

function arrayAt(value: unknown, key: string): unknown[] {
  const field = isRecord(value) ? value[key] : undefined;
  return Array.isArray(field) ? field : [];
}
