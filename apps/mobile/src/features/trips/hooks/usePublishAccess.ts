import type { Vehicule } from '@contract';

import { useActiveVehicles, useMyApplication } from '@/features/verification';

import { publishBlocker, type PublishBlocker } from '../rules';

export type PublishAccess =
  | { status: 'loading' }
  | { status: 'error'; error: Error; retry: () => void }
  | { status: 'blocked'; blocker: PublishBlocker }
  | { status: 'ready'; vehicle: Vehicule };

/**
 * Can this driver publish? Same rule as the server (`publishBlocker`): a validated
 * driver with a validated default vehicle. The screens explain, the server refuses.
 */
export function usePublishAccess(): PublishAccess {
  const application = useMyApplication();
  const vehicles = useActiveVehicles();

  if (application.isError || vehicles.isError) {
    return {
      status: 'error',
      error: application.error ?? vehicles.error ?? new Error('Chargement impossible.'),
      retry: () => {
        void application.refetch();
        void vehicles.refetch();
      },
    };
  }
  if (!application.data || !vehicles.data) return { status: 'loading' };

  const blocker = publishBlocker(application.data.statutChauffeur, vehicles.data);
  const vehicle = vehicles.data.find((v) => v.parDefaut && v.statut === 'valide');
  if (blocker || !vehicle) return { status: 'blocked', blocker: blocker ?? 'vehicle_pending' };
  return { status: 'ready', vehicle };
}
