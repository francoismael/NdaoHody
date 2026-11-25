import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { DeviceRegistry, DevicePlatform } from '../../application/port/DeviceRegistry';
import { DeviceDocument } from '../persistence/mongo/DeviceDocument';

@Injectable()
export class MongoDeviceRegistryAdapter extends DeviceRegistry {
  constructor(@InjectModel(DeviceDocument.name) private readonly devices: Model<DeviceDocument>) {
    super();
  }

  async register(utilisateurId: number, jeton: string, plateforme: DevicePlatform): Promise<void> {
    await this.devices.updateOne({ jeton }, { $set: { utilisateurId, plateforme } }, { upsert: true });
  }

  async unregister(utilisateurId: number, jeton: string): Promise<void> {
    await this.devices.deleteOne({ utilisateurId, jeton });
  }

  async unregisterAll(utilisateurId: number): Promise<void> {
    await this.devices.deleteMany({ utilisateurId });
  }
}
