/** Use cases of bookings wired with in-memory fakes (shared by the booking tests). */
import type { CreateBookingRequest } from '../../src/application/dto/BookingRequests';
import { AnswerBookingUseCase } from '../../src/application/usecases/bookings/AnswerBookingUseCase';
import { ManageBookingsUseCase } from '../../src/application/usecases/bookings/ManageBookingsUseCase';
import { RequestBookingUseCase } from '../../src/application/usecases/bookings/RequestBookingUseCase';
import { RunRideJobsUseCase } from '../../src/application/usecases/jobs/RunRideJobsUseCase';
import { BadgeService } from '../../src/application/service/BadgeService';
import { TripCancellationService } from '../../src/application/service/TripCancellationService';
import { ReviewsUseCase } from '../../src/application/usecases/reviews/ReviewsUseCase';
import { ManageRideUseCase } from '../../src/application/usecases/rides/ManageRideUseCase';
import { ManageTripsUseCase } from '../../src/application/usecases/trips/ManageTripsUseCase';
import type { Trip } from '../../src/domain/entity/Trip';
import { DirectUnitOfWork, FixedClock, InMemorySettings, InMemoryUsers, makeUser } from './inMemory';
import { InMemoryVehicles, makeVehicle } from './inMemoryDriver';
import {
  FixedBlocks,
  FixedReports,
  FixedTariffs,
  InMemoryBookings,
  InMemoryReviews,
  InMemoryTrips,
  makeMatch,
  makeTrip,
  RecordedConversations,
  RecordedPositions,
  RecordingNotifier,
  RecordingPublisher,
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
  const realtime = new RecordingPublisher();
  const positions = new RecordedPositions();
  const conversations = new RecordedConversations();
  const clock = new FixedClock();
  const unitOfWork = new DirectUnitOfWork();
  const settings = new InMemorySettings({ delai_reponse_secondes: 180, relances_max: 2 });
  const vehicles = new InMemoryVehicles(makeVehicle({ id: 1, utilisateurId: 1 }));
  const users = new InMemoryUsers({ ...DRIVER }, { ...PASSENGER });
  const request = new RequestBookingUseCase(
    trips,
    bookings,
    vehicles,
    new FixedTariffs(),
    new FixedBlocks(blocked),
    settings,
    notifier,
    realtime,
    clock,
  );
  const answer = new AnswerBookingUseCase(bookings, trips, conversations, notifier, realtime, unitOfWork, clock);
  const manage = new ManageBookingsUseCase(bookings, trips, notifier, realtime, unitOfWork, clock);
  const cancellation = new TripCancellationService(trips, bookings, notifier, realtime, unitOfWork, clock);
  const jobs = new RunRideJobsUseCase(bookings, trips, positions, cancellation, notifier, realtime, clock);
  const badges = new BadgeService(users, vehicles, new FixedReports(), notifier);
  const ride = new ManageRideUseCase(bookings, trips, users, positions, settings, badges, notifier, realtime, unitOfWork, clock);
  const reviews = new ReviewsUseCase(new InMemoryReviews(users), bookings, trips, users, badges, unitOfWork, clock);
  const tripsUseCase = new ManageTripsUseCase(trips, bookings, positions, settings, cancellation, notifier, unitOfWork, clock);
  return { request, answer, manage, jobs, ride, reviews, tripsUseCase, trips, bookings, users, notifier, realtime, positions, conversations, clock };
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
