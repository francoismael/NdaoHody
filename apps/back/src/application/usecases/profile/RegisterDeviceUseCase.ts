import { Injectable } from '@nestjs/common';
import type { User } from '../../../domain/entity/User';
import type { RegisterDeviceRequest } from '../../dto/ProfileRequests';
import { DeviceRegistry } from '../../port/DeviceRegistry';

/** POST /me/devices: the phone gives its FCM token after sign-in (and whenever it changes). */
@Injectable()
export class RegisterDeviceUseCase {
  constructor(private readonly devices: DeviceRegistry) {}

  execute(user: User, request: RegisterDeviceRequest): Promise<void> {
    return this.devices.register(user.id, request.jeton, request.plateforme);
  }
}
