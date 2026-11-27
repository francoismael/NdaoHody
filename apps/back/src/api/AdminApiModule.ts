import { Module } from '@nestjs/common';
import { BadgeService } from '../application/service/BadgeService';
import { AdminSignInUseCase } from '../application/usecases/admin/AdminSignInUseCase';
import { AuthenticateAdminUseCase } from '../application/usecases/admin/AuthenticateAdminUseCase';
import { ManageAdminAccountsUseCase } from '../application/usecases/admin/ManageAdminAccountsUseCase';
import { ReviewDriverApplicationsUseCase } from '../application/usecases/admin/ReviewDriverApplicationsUseCase';
import { ReviewVehiclesUseCase } from '../application/usecases/admin/ReviewVehiclesUseCase';
import { AdminAccountsController } from './controller/admin/AdminAccountsController';
import { AdminAuthController } from './controller/admin/AdminAuthController';
import { AdminDriversController } from './controller/admin/AdminDriversController';
import { AdminVehiclesController } from './controller/admin/AdminVehiclesController';
import { AdminAccessGuard } from './guard/AdminAccessGuard';
import { AdminJournalInterceptor } from './interceptor/AdminJournalInterceptor';

/**
 * Routes of the back-office, served under /api/admin.
 * Add here the controllers used by super_admin, admin and investisseur accounts, and their use cases.
 */
@Module({
  controllers: [AdminAuthController, AdminAccountsController, AdminDriversController, AdminVehiclesController],
  providers: [
    AdminAccessGuard,
    AdminJournalInterceptor,
    AuthenticateAdminUseCase,
    AdminSignInUseCase,
    ManageAdminAccountsUseCase,
    ReviewDriverApplicationsUseCase,
    ReviewVehiclesUseCase,
    BadgeService,
  ],
})
export class AdminApiModule {}
