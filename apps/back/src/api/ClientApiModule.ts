import { Module } from '@nestjs/common';
import { RealtimePublisher } from '../application/port/RealtimePublisher';
import { BadgeService } from '../application/service/BadgeService';
import { TrackingService } from '../application/service/TrackingService';
import { PublicProfilesUseCase } from '../application/usecases/reviews/PublicProfilesUseCase';
import { ReviewsUseCase } from '../application/usecases/reviews/ReviewsUseCase';
import { ManageRideUseCase } from '../application/usecases/rides/ManageRideUseCase';
import { GetTrackingUseCase } from '../application/usecases/tracking/GetTrackingUseCase';
import { ShareDriverPositionUseCase } from '../application/usecases/tracking/ShareDriverPositionUseCase';
import { SharePassengerPositionUseCase } from '../application/usecases/tracking/SharePassengerPositionUseCase';
import { LiveGateway } from './gateway/LiveGateway';
import { SocketRealtimePublisher } from './gateway/SocketRealtimePublisher';
import { AccountRecoveryService } from '../application/service/AccountRecoveryService';
import { EtaService } from '../application/service/EtaService';
import { SessionIssuerService } from '../application/service/SessionIssuerService';
import { TripCancellationService } from '../application/service/TripCancellationService';
import { AnswerBookingUseCase } from '../application/usecases/bookings/AnswerBookingUseCase';
import { ManageBookingsUseCase } from '../application/usecases/bookings/ManageBookingsUseCase';
import { RequestBookingUseCase } from '../application/usecases/bookings/RequestBookingUseCase';
import { RunRideJobsUseCase } from '../application/usecases/jobs/RunRideJobsUseCase';
import { ManageTripsUseCase } from '../application/usecases/trips/ManageTripsUseCase';
import { PublishTripUseCase } from '../application/usecases/trips/PublishTripUseCase';
import { SearchTripsUseCase } from '../application/usecases/trips/SearchTripsUseCase';
import { RideJobsScheduler } from '../infrastructure/scheduler/RideJobsScheduler';
import { AuthenticateUserUseCase } from '../application/usecases/auth/AuthenticateUserUseCase';
import { RefreshSessionUseCase } from '../application/usecases/auth/RefreshSessionUseCase';
import { RequestOtpUseCase } from '../application/usecases/auth/RequestOtpUseCase';
import { SignOutUseCase } from '../application/usecases/auth/SignOutUseCase';
import { VerifyOtpUseCase } from '../application/usecases/auth/VerifyOtpUseCase';
import { AddVehicleUseCase } from '../application/usecases/driver/AddVehicleUseCase';
import { GetDriverApplicationUseCase } from '../application/usecases/driver/GetDriverApplicationUseCase';
import { ManageVehiclesUseCase } from '../application/usecases/driver/ManageVehiclesUseCase';
import { SubmitDriverDocumentUseCase } from '../application/usecases/driver/SubmitDriverDocumentUseCase';
import { PreviewRouteUseCase } from '../application/usecases/geo/PreviewRouteUseCase';
import { SearchPlacesUseCase } from '../application/usecases/geo/SearchPlacesUseCase';
import { DeleteAccountUseCase } from '../application/usecases/profile/DeleteAccountUseCase';
import { RegisterDeviceUseCase } from '../application/usecases/profile/RegisterDeviceUseCase';
import { SwitchModeUseCase } from '../application/usecases/profile/SwitchModeUseCase';
import { UnregisterDeviceUseCase } from '../application/usecases/profile/UnregisterDeviceUseCase';
import { UpdateProfilePhotoUseCase } from '../application/usecases/profile/UpdateProfilePhotoUseCase';
import { UpdateProfileUseCase } from '../application/usecases/profile/UpdateProfileUseCase';
import { AuthController } from './controller/AuthController';
import { BookingsController } from './controller/BookingsController';
import { DriverController } from './controller/DriverController';
import { GeoController } from './controller/GeoController';
import { MeController } from './controller/MeController';
import { MyRidesController } from './controller/MyRidesController';
import { ReviewsController } from './controller/ReviewsController';
import { TripsController } from './controller/TripsController';
import { AccessTokenGuard } from './guard/AccessTokenGuard';

/**
 * Routes of the native app, served under /api/v1.
 * Add here the controllers used by passengers and drivers, and their use cases.
 */
@Module({
  controllers: [AuthController, MeController, MyRidesController, DriverController, GeoController, TripsController, BookingsController, ReviewsController],
  providers: [
    AccessTokenGuard,
    SessionIssuerService,
    AccountRecoveryService,
    AuthenticateUserUseCase,
    RequestOtpUseCase,
    VerifyOtpUseCase,
    RefreshSessionUseCase,
    SignOutUseCase,
    UpdateProfileUseCase,
    SwitchModeUseCase,
    UpdateProfilePhotoUseCase,
    DeleteAccountUseCase,
    RegisterDeviceUseCase,
    UnregisterDeviceUseCase,
    GetDriverApplicationUseCase,
    SubmitDriverDocumentUseCase,
    AddVehicleUseCase,
    ManageVehiclesUseCase,
    SearchPlacesUseCase,
    PreviewRouteUseCase,
    EtaService,
    TripCancellationService,
    PublishTripUseCase,
    ManageTripsUseCase,
    SearchTripsUseCase,
    RequestBookingUseCase,
    AnswerBookingUseCase,
    ManageBookingsUseCase,
    RunRideJobsUseCase,
    RideJobsScheduler,
    TrackingService,
    ShareDriverPositionUseCase,
    SharePassengerPositionUseCase,
    GetTrackingUseCase,
    SocketRealtimePublisher,
    { provide: RealtimePublisher, useExisting: SocketRealtimePublisher },
    LiveGateway,
    BadgeService,
    ManageRideUseCase,
    ReviewsUseCase,
    PublicProfilesUseCase,
  ],
})
export class ClientApiModule {}
