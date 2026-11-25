import { Module } from '@nestjs/common';
import { AccountRecoveryService } from '../application/service/AccountRecoveryService';
import { SessionIssuerService } from '../application/service/SessionIssuerService';
import { AuthenticateUserUseCase } from '../application/usecases/auth/AuthenticateUserUseCase';
import { RefreshSessionUseCase } from '../application/usecases/auth/RefreshSessionUseCase';
import { RequestOtpUseCase } from '../application/usecases/auth/RequestOtpUseCase';
import { SignOutUseCase } from '../application/usecases/auth/SignOutUseCase';
import { VerifyOtpUseCase } from '../application/usecases/auth/VerifyOtpUseCase';
import { AddVehicleUseCase } from '../application/usecases/driver/AddVehicleUseCase';
import { GetDriverApplicationUseCase } from '../application/usecases/driver/GetDriverApplicationUseCase';
import { ManageVehiclesUseCase } from '../application/usecases/driver/ManageVehiclesUseCase';
import { SubmitDriverDocumentUseCase } from '../application/usecases/driver/SubmitDriverDocumentUseCase';
import { DeleteAccountUseCase } from '../application/usecases/profile/DeleteAccountUseCase';
import { RegisterDeviceUseCase } from '../application/usecases/profile/RegisterDeviceUseCase';
import { SwitchModeUseCase } from '../application/usecases/profile/SwitchModeUseCase';
import { UnregisterDeviceUseCase } from '../application/usecases/profile/UnregisterDeviceUseCase';
import { UpdateProfilePhotoUseCase } from '../application/usecases/profile/UpdateProfilePhotoUseCase';
import { UpdateProfileUseCase } from '../application/usecases/profile/UpdateProfileUseCase';
import { AuthController } from './controller/AuthController';
import { DriverController } from './controller/DriverController';
import { MeController } from './controller/MeController';
import { AccessTokenGuard } from './guard/AccessTokenGuard';

/**
 * Routes of the native app, served under /api/v1.
 * Add here the controllers used by passengers and drivers, and their use cases.
 */
@Module({
  controllers: [AuthController, MeController, DriverController],
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
  ],
})
export class ClientApiModule {}
