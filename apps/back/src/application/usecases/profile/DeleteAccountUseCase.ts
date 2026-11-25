import { Injectable, Logger } from '@nestjs/common';
import { deletedPhoneNumber, type User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { UserSessionRepository } from '../../../domain/repository/UserSessionRepository';
import { UserRepository } from '../../../domain/repository/UserRepository';
import { Clock } from '../../port/Clock';
import { DeviceRegistry } from '../../port/DeviceRegistry';
import { FileStorage } from '../../port/FileStorage';
import { UnitOfWork } from '../../port/UnitOfWork';
import { bestEffort } from '../../helper/bestEffort';

/**
 * DELETE /me: soft delete, refused during a ride.
 * The row stays (trips, bookings and reviews keep their author), but:
 * statut = supprime, phone number freed (the number can sign up again),
 * photo removed, every session closed, phones unregistered from push.
 */
@Injectable()
export class DeleteAccountUseCase {
  private readonly logger = new Logger(DeleteAccountUseCase.name);

  constructor(
    private readonly users: UserRepository,
    private readonly sessions: UserSessionRepository,
    private readonly devices: DeviceRegistry,
    private readonly storage: FileStorage,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(user: User): Promise<void> {
    if (await this.users.hasRideInProgress(user.id)) {
      throw new DomainException('conflict', 'Impossible de supprimer ton compte pendant une course.');
    }

    await this.unitOfWork.run(async () => {
      await this.users.update(user.id, {
        statut: 'supprime',
        telephone: deletedPhoneNumber(user.id),
        photoUrl: null,
      });
      await this.sessions.revokeAllForUser(user.id, this.clock.now());
    });

    // Outside the transaction: the account is deleted even if MongoDB or the disk fails.
    await bestEffort(this.logger, 'Deleted account: push devices not removed', this.devices.unregisterAll(user.id));
    if (user.photoUrl) {
      await bestEffort(this.logger, 'Deleted account: profile photo not removed', this.storage.remove(user.photoUrl));
    }
  }
}
