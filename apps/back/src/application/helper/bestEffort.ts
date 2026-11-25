import type { Logger } from '@nestjs/common';
import type { NewNotification, UserNotifier } from '../port/UserNotifier';

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs a side task (notification, file cleanup...) whose failure must not fail the request:
 * the error is only logged.
 */
export async function bestEffort(logger: Logger, what: string, task: Promise<unknown>): Promise<void> {
  try {
    await task;
  } catch (error) {
    logger.warn(`${what}: ${describeError(error)}`);
  }
}

export function notifyBestEffort(logger: Logger, notifier: UserNotifier, notification: NewNotification): Promise<void> {
  return bestEffort(logger, `User ${notification.utilisateurId} not notified`, notifier.notify(notification));
}
