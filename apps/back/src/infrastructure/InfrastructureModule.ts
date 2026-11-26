import { ClassProvider, Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessTokenService, AdminTokenService } from '../application/port/AccessTokenService';
import { Clock } from '../application/port/Clock';
import { DeviceRegistry } from '../application/port/DeviceRegistry';
import { FileStorage } from '../application/port/FileStorage';
import { HealthChecker } from '../application/port/HealthChecker';
import { ImageProcessor } from '../application/port/ImageProcessor';
import { PasswordHasher } from '../application/port/PasswordHasher';
import { PlaceSearch } from '../application/port/PlaceSearch';
import { PrivateFileStorage } from '../application/port/PrivateFileStorage';
import { RandomGenerator } from '../application/port/RandomGenerator';
import { RouteProvider } from '../application/port/RouteProvider';
import { SecretHasher } from '../application/port/SecretHasher';
import { SmsSender } from '../application/port/SmsSender';
import { UnitOfWork } from '../application/port/UnitOfWork';
import { UserNotifier } from '../application/port/UserNotifier';
import { AdminAccountRepository } from '../domain/repository/AdminAccountRepository';
import { AdminJournalRepository } from '../domain/repository/AdminJournalRepository';
import { DriverDocumentRepository } from '../domain/repository/DriverDocumentRepository';
import { OtpCodeRepository } from '../domain/repository/OtpCodeRepository';
import { SettingRepository } from '../domain/repository/SettingRepository';
import { UserSessionRepository } from '../domain/repository/UserSessionRepository';
import { UserRepository } from '../domain/repository/UserRepository';
import { VehicleRepository } from '../domain/repository/VehicleRepository';
import { BcryptPasswordHasherAdapter } from './adapter/BcryptPasswordHasherAdapter';
import { CryptoRandomGeneratorAdapter } from './adapter/CryptoRandomGeneratorAdapter';
import { HealthCheckerAdapter } from './adapter/HealthCheckerAdapter';
import { HmacSecretHasherAdapter } from './adapter/HmacSecretHasherAdapter';
import { JwtAccessTokenAdapter, JwtAdminTokenAdapter } from './adapter/JwtTokenAdapters';
import { LocalFileStorageAdapter } from './adapter/LocalFileStorageAdapter';
import { LocalPrivateFileStorageAdapter } from './adapter/LocalPrivateFileStorageAdapter';
import { LogSmsSenderAdapter } from './adapter/LogSmsSenderAdapter';
import { MapboxClient } from './adapter/MapboxClient';
import { MapboxPlaceSearchAdapter } from './adapter/MapboxPlaceSearchAdapter';
import { MapboxRouteProviderAdapter } from './adapter/MapboxRouteProviderAdapter';
import { MongoDeviceRegistryAdapter } from './adapter/MongoDeviceRegistryAdapter';
import { MongoUserNotifierAdapter } from './adapter/MongoUserNotifierAdapter';
import { SharpImageProcessorAdapter } from './adapter/SharpImageProcessorAdapter';
import { SystemClockAdapter } from './adapter/SystemClockAdapter';
import { TypeOrmUnitOfWorkAdapter } from './adapter/TypeOrmUnitOfWorkAdapter';
import { DeviceDocument, DeviceSchema } from './persistence/mongo/DeviceDocument';
import { NotificationDocument, NotificationSchema } from './persistence/mongo/NotificationDocument';
import { POSTGRES_ENTITIES } from './persistence/postgres/entities';
import { TypeOrmAdminAccountRepository } from './persistence/postgres/repositories/TypeOrmAdminAccountRepository';
import { TypeOrmAdminJournalRepository } from './persistence/postgres/repositories/TypeOrmAdminJournalRepository';
import { TypeOrmDriverDocumentRepository } from './persistence/postgres/repositories/TypeOrmDriverDocumentRepository';
import { TypeOrmOtpCodeRepository } from './persistence/postgres/repositories/TypeOrmOtpCodeRepository';
import { TypeOrmSettingRepository } from './persistence/postgres/repositories/TypeOrmSettingRepository';
import { TypeOrmUserSessionRepository } from './persistence/postgres/repositories/TypeOrmUserSessionRepository';
import { TypeOrmUserRepository } from './persistence/postgres/repositories/TypeOrmUserRepository';
import { TypeOrmVehicleRepository } from './persistence/postgres/repositories/TypeOrmVehicleRepository';
import { TransactionContext } from './persistence/postgres/TransactionContext';

/** Port or repository (application / domain) -> its implementation (infrastructure). */
const BINDINGS: ClassProvider[] = [
  { provide: Clock, useClass: SystemClockAdapter },
  { provide: UnitOfWork, useClass: TypeOrmUnitOfWorkAdapter },
  { provide: SmsSender, useClass: LogSmsSenderAdapter },
  { provide: SecretHasher, useClass: HmacSecretHasherAdapter },
  { provide: RandomGenerator, useClass: CryptoRandomGeneratorAdapter },
  { provide: AccessTokenService, useClass: JwtAccessTokenAdapter },
  { provide: AdminTokenService, useClass: JwtAdminTokenAdapter },
  { provide: PasswordHasher, useClass: BcryptPasswordHasherAdapter },
  { provide: FileStorage, useClass: LocalFileStorageAdapter },
  { provide: PrivateFileStorage, useClass: LocalPrivateFileStorageAdapter },
  { provide: ImageProcessor, useClass: SharpImageProcessorAdapter },
  { provide: DeviceRegistry, useClass: MongoDeviceRegistryAdapter },
  { provide: UserNotifier, useClass: MongoUserNotifierAdapter },
  { provide: RouteProvider, useClass: MapboxRouteProviderAdapter },
  { provide: PlaceSearch, useClass: MapboxPlaceSearchAdapter },
  { provide: HealthChecker, useClass: HealthCheckerAdapter },
  { provide: UserRepository, useClass: TypeOrmUserRepository },
  { provide: OtpCodeRepository, useClass: TypeOrmOtpCodeRepository },
  { provide: UserSessionRepository, useClass: TypeOrmUserSessionRepository },
  { provide: SettingRepository, useClass: TypeOrmSettingRepository },
  { provide: DriverDocumentRepository, useClass: TypeOrmDriverDocumentRepository },
  { provide: VehicleRepository, useClass: TypeOrmVehicleRepository },
  { provide: AdminAccountRepository, useClass: TypeOrmAdminAccountRepository },
  { provide: AdminJournalRepository, useClass: TypeOrmAdminJournalRepository },
];

/**
 * Wires every port to its adapter. Global: the API modules only list their controllers and use cases.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature(POSTGRES_ENTITIES),
    MongooseModule.forFeature([
      { name: DeviceDocument.name, schema: DeviceSchema },
      { name: NotificationDocument.name, schema: NotificationSchema },
    ]),
  ],
  providers: [TransactionContext, MapboxClient, ...BINDINGS],
  exports: BINDINGS.map((binding) => binding.provide),
})
export class InfrastructureModule {}
