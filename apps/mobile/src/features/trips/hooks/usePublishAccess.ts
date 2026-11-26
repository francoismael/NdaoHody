import type { Vehicule } from '@contract';

import { useActiveVehicles, useMyApplication } from '@/features/verification';

import { publishBlocker, usableVehicles, type PublishBlocker } from '../rules';

export type PublishAccess =
  | { status: 'loading' }
  | { status: 'error'; error: Error; retry: () => void }
  | { status: 'blocked'; blocker: PublishBlocker }
  /** The validated vehicles, the default one first: the driver picks one when there are several. */
  | { status: 'ready'; vehicles: Vehicule[] };

/**
 * Can this driver publish? Same rule as the server (`publishBlocker`): a validated
 * driver with at least one validated vehicle. The screens explain, the server refuses.
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
  const usable = [...usableVehicles(vehicles.data)].sort((a, b) => Number(b.parDefaut) - Number(a.parDefaut));
  if (blocker || usable.length === 0) return { status: 'blocked', blocker: blocker ?? 'vehicle_pending' };
  return { status: 'ready', vehicles: usable };
}
