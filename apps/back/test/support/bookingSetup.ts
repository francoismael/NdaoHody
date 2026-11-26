/** Use cases of bookings wired with in-memory fakes (shared by the booking tests). */
import type { CreateBookingRequest } from '../../src/application/dto/BookingRequests';
import { AnswerBookingUseCase } from '../../src/application/usecases/bookings/AnswerBookingUseCase';
import { ManageBookingsUseCase } from '../../src/application/usecases/bookings/ManageBookingsUseCase';
import { RequestBookingUseCase } from '../../src/application/usecases/bookings/RequestBookingUseCase';
import { RunRideJobsUseCase } from '../../src/application/usecases/jobs/RunRideJobsUseCase';
import { TripCancellationService } from '../../src/application/service/TripCancellationService';
import type { Trip } from '../../src/domain/entity/Trip';
import { DirectUnitOfWork, FixedClock, InMemorySettings, makeUser } from './inMemory';
import { InMemoryVehicles, makeVehicle } from './inMemoryDriver';
import {
  FixedBlocks,
  FixedTariffs,
  InMemoryBookings,
  InMemoryTrips,
  makeMatch,
  makeTrip,
  RecordedConversations,
  RecordingNotifier,
} from './inMemoryRides';

export const DRIVER = makeUser({ id: 1, statutChauffeur: 'valide' });
export const PASSENGER = makeUser({ id: 9, telephone: '+261340000009' });
export const REQUEST: CreateBookingRequest = {
  trajetId: 1,
  places: 2,
  priseEnCharge: { libelle: 'Tanjombato', latitude: -18.96, longitude: 47.528 },
  depose: { libelle: 'Analakely', latitude: -18.9067, longitude: 47.5253 },
};

export function setupBookings({ placesLibres = 4, blocked = false } = {}) {
  const trips = new InMemoryTrips(makeTrip({ id: 1, chauffeurId: 1, placesLibres }));
  trips.matches = [makeMatch({ tripId: 1, distanceMetres: 12_000 })];
  const bookings = new InMemoryBookings();
  const notifier = new RecordingNotifier();
  const conversations = new RecordedConversations();
  const clock = new FixedClock();
  const unitOfWork = new DirectUnitOfWork();
  const settings = new InMemorySettings({ delai_reponse_secondes: 180, relances_max: 2 });
  const request = new RequestBookingUseCase(
    trips,
    bookings,
    new InMemoryVehicles(makeVehicle({ id: 1, utilisateurId: 1 })),
    new FixedTariffs(),
    new FixedBlocks(blocked),
    settings,
    notifier,
    clock,
  );
  const answer = new AnswerBookingUseCase(bookings, trips, conversations, notifier, unitOfWork, clock);
  const manage = new ManageBookingsUseCase(bookings, trips, notifier, unitOfWork, clock);
  const cancellation = new TripCancellationService(trips, bookings, notifier, unitOfWork, clock);
  const jobs = new RunRideJobsUseCase(bookings, trips, cancellation, notifier, clock);
  return { request, answer, manage, jobs, trips, bookings, notifier, conversations, clock };
}


/** Marks a booking as expired, as the 3-minute job would. */
export function expire(bookings: InMemoryBookings, id: number): void {
  const booking = bookings.rows.find((row) => row.id === id);
  if (booking) booking.statut = 'expiree';
}

export async function tripOne(trips: InMemoryTrips): Promise<Trip> {
  const trip = await trips.findById(1);
  if (!trip) throw new Error('trip 1 missing');
  return trip;
}
