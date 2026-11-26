import { AdminAccountEntity } from './AdminAccountEntity';
import { AdminJournalEntity } from './AdminJournalEntity';
import { BookingEntity } from './BookingEntity';
import { DriverDocumentEntity } from './DriverDocumentEntity';
import { OtpCodeEntity } from './OtpCodeEntity';
import { SettingEntity } from './SettingEntity';
import { TariffEntity } from './TariffEntity';
import { TripEntity } from './TripEntity';
import { UserSessionEntity } from './UserSessionEntity';
import { UserEntity } from './UserEntity';
import { VehicleEntity } from './VehicleEntity';

/** Every TypeORM entity. Tables come from the migrations, never from these classes. */
export const POSTGRES_ENTITIES = [
  UserEntity,
  OtpCodeEntity,
  UserSessionEntity,
  SettingEntity,
  DriverDocumentEntity,
  VehicleEntity,
  AdminAccountEntity,
  AdminJournalEntity,
  TripEntity,
  BookingEntity,
  TariffEntity,
];
