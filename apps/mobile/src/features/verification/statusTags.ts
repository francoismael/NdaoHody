import type { StatutValidation, StatutVehicule } from '@contract';

import type { TagTone } from '@/shared/ui';

/** How a document or vehicle status is shown (waiting screen, "Mes véhicules"). */
export const STATUS_TAGS: Record<StatutValidation | StatutVehicule, { label: string; tone: TagTone }> = {
  en_attente: { label: 'En vérification', tone: 'neutral' },
  valide: { label: 'Validé', tone: 'accent' },
  refuse: { label: 'Refusé', tone: 'info' },
  archive: { label: 'Archivé', tone: 'neutral' },
};
