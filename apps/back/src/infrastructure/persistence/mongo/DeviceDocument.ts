import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DEVICE_PLATFORMS, type DevicePlatform } from '../../../application/port/DeviceRegistry';

/** Collection appareils: FCM token of each phone, used to send push notifications. */
@Schema({ collection: 'appareils', timestamps: { createdAt: 'dateCreation', updatedAt: 'dateMiseAJour' } })
export class DeviceDocument {
  @Prop({ required: true, index: true })
  utilisateurId!: number;

  @Prop({ required: true, unique: true })
  jeton!: string;

  @Prop({ required: true, type: String, enum: DEVICE_PLATFORMS })
  plateforme!: DevicePlatform;
}

export const DeviceSchema = SchemaFactory.createForClass(DeviceDocument);
