import type { ResultatRecherche } from '@contract';

import { currentTime, formatDay, formatDuration, formatTime } from '@/shared/utils';

/** When a driver passes the passenger's pickup: "passe dans" + "6 min", or "passe demain" + "07:42". Search and booking. */
export function passingWhen(result: Pick<ResultatRecherche, 'arriveeDansMinutes' | 'heurePassage' | 'trajet'>): { label: string; value: string } {
  if (result.arriveeDansMinutes !== null) return { label: 'passe dans', value: formatDuration(result.arriveeDansMinutes * 60) };
  const at = new Date(result.heurePassage ?? result.trajet.dateDepart);
  return { label: `passe ${formatDay(at, currentTime())}`, value: formatTime(at) };
}
