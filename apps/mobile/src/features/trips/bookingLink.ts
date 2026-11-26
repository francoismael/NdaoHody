import type { Lieu } from '@contract';

import { decodePlace, encodePlace } from './publishParams';

/**
 * What the booking window needs from where the passenger came from
 * (home, search results or the driver's profile): one shape for the three entries.
 */
export type BookingLink = {
  tripId: number;
  places: number;
  /** Where the passenger wants to be picked up; null = "my position" (as in the search). */
  priseEnCharge: Lieu | null;
  /** Where he drops him; null = not chosen yet (from the home): the window starts on the trip's arrival. */
  depose: Lieu | null;
};

/** The link as route params (text), shared by /book/[id] and /driver/[id]. */
export type BookingParams = { tripId?: string; places?: string; priseEnCharge?: string; depose?: string };

/** Only the contract fields: the server refuses unknown ones. */
export const contractLieu = ({ libelle, latitude, longitude }: Lieu): Lieu => ({ libelle, latitude, longitude });

const toParams = (link: BookingLink) => ({
  tripId: String(link.tripId),
  places: String(link.places),
  ...(link.priseEnCharge ? { priseEnCharge: encodePlace(link.priseEnCharge) } : {}),
  ...(link.depose ? { depose: encodePlace(link.depose) } : {}),
});

/** The only way to open the booking window. */
export const bookingHref = (link: BookingLink) => ({ pathname: '/book/[id]' as const, params: { id: String(link.tripId), ...toParams(link) } });

/** The driver's profile, keeping the link so its "Réserver une place" opens the same window. */
export const driverProfileHref = (driverId: number, link: BookingLink) => ({
  pathname: '/driver/[id]' as const,
  params: { id: String(driverId), ...toParams(link) },
});

/** Reads the link back from the route params; null if the trip is missing. */
export function readBookingLink(params: BookingParams): BookingLink | null {
  const tripId = Number(params.tripId);
  const pickup = decodePlace(params.priseEnCharge);
  if (!Number.isInteger(tripId)) return null;
  const places = Number(params.places);
  const drop = decodePlace(params.depose);
  return {
    tripId,
    places: Number.isInteger(places) && places >= 1 ? places : 1,
    priseEnCharge: pickup ? contractLieu(pickup) : null,
    depose: drop ? contractLieu(drop) : null,
  };
}
