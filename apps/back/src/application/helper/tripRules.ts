import { DomainException } from '../../domain/exception/DomainException';
import type { SettingRepository } from '../../domain/repository/SettingRepository';
import { DAY_MS, MINUTE_MS } from './durations';
import { MAX_DAYS_AHEAD, readSetting } from './settings';

/** A trip planned ahead leaves at least this long after it is published or changed. */
export const MIN_LEAD_MINUTES = 15;
/** "Je pars" is accepted from this long before the planned time... */
export const START_EARLY_MINUTES = 30;
/** ...and a trip still not started this long after its time is cancelled. */
export const START_LATE_MINUTES = 30;

/** Throws unless a planned departure is between 15 minutes and 15 days (setting) from now. */
export async function assertDepartureDate(settings: SettingRepository, date: Date, now: Date): Promise<void> {
  if (Number.isNaN(date.getTime())) {
    throw new DomainException('invalid', 'Date de départ invalide.');
  }
  if (date.getTime() < now.getTime() + MIN_LEAD_MINUTES * MINUTE_MS) {
    throw new DomainException('invalid', `Le départ doit être dans ${MIN_LEAD_MINUTES} minutes au moins. Sinon, publie un trajet immédiat.`);
  }
  const maxDays = await readSetting(settings, MAX_DAYS_AHEAD);
  if (date.getTime() > now.getTime() + maxDays * DAY_MS) {
    throw new DomainException('invalid', `Un trajet se publie au plus ${maxDays} jours à l’avance.`);
  }
}
