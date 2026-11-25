import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Notification, TypeNotification } from '@contract';
import { Schema as MongooseSchema } from 'mongoose';

/** Collection notifications: history shown in the app (data object Notification). */
@Schema({ collection: 'notifications', timestamps: { createdAt: 'dateCreation', updatedAt: false } })
export class NotificationDocument {
  @Prop({ required: true, index: true })
  utilisateurId!: number;

  @Prop({ required: true, type: String })
  type!: TypeNotification;

  @Prop({ required: true })
  titre!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  donnees!: Notification['donnees'];

  @Prop({ default: false })
  lu!: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationDocument);
