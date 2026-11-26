import type { ProfilPublic, Vehicule } from '@contract';

/**
 * GET /drivers/:id/public: what a passenger sees of a driver before booking.
 * GAP #13 (to send to the backend): `ProfilPublic` has neither the rides count nor the
 * vehicle; the server adds them here. The plate is left out (shown once booked).
 */
export type DriverPublicProfile = ProfilPublic & {
  /** Finished rides as a driver, counted by the server. */
  nombreCourses: number;
  /** His default validated vehicle; null if he has none. */
  vehicule: Pick<Vehicule, 'type' | 'marque' | 'modele' | 'couleur'> | null;
};
