import { Injectable } from '@nestjs/common';
import type { User } from '../../../domain/entity/User';
import { DeviceRegistry } from '../../port/DeviceRegistry';

/** DELETE /me/devices: called on sign-out so the phone stops receiving notifications. */
@Injectable()
export class UnregisterDeviceUseCase {
  constructor(private readonly devices: DeviceRegistry) {}

  execute(user: User, jeton: string): Promise<void> {
    return this.devices.unregister(user.id, jeton);
  }
}
