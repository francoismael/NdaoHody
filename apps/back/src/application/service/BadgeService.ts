import { Injectable, Logger } from '@nestjs/common';
import { computeBadge, isUpgrade } from '../../domain/entity/badge';
import { ReportRepository } from '../../domain/repository/ReportRepository';
import { UserRepository } from '../../domain/repository/UserRepository';
import { VehicleRepository } from '../../domain/repository/VehicleRepository';
import { notifyBestEffort } from '../helper/bestEffort';
import { UserNotifier } from '../port/UserNotifier';

const BADGE_NAMES = { verifie: 'Vérifié', top: 'Top' } as const;

/**
 * Computes a user's badge again (see domain/entity/badge.ts) and saves it when it changed.
 * Called after each finished ride, review, absence and admin decision about a driver.
 */
@Injectable()
export class BadgeService {
  private readonly logger = new Logger(BadgeService.name);

  constructor(
    private readonly users: UserRepository,
    private readonly vehicles: VehicleRepository,
    private readonly reports: ReportRepository,
    private readonly notifier: UserNotifier,
  ) {}

  async refresh(userId: number): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user || user.statut === 'supprime') {
      return;
    }
    const [vehicles, confirmedReports] = await Promise.all([
      this.vehicles.listByOwner(user.id),
      this.reports.countConfirmedAgainst(user.id),
    ]);
    const badge = computeBadge({
      user,
      hasValidatedVehicle: vehicles.some((vehicle) => vehicle.statut === 'valide'),
      confirmedReports,
    });
    if (badge === user.badge) {
      return;
    }

    await this.users.update(user.id, { badge });
    if (isUpgrade(user.badge, badge) && (badge === 'verifie' || badge === 'top')) {
      await notifyBestEffort(this.logger, this.notifier, {
        utilisateurId: user.id,
        type: 'badge_obtenu',
        titre: 'Nouveau badge',
        message: `Bravo, tu as le badge « ${BADGE_NAMES[badge]} ».`,
        donnees: {},
      });
    }
  }
}
