import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { NewNotification, UserNotifier } from '../../application/port/UserNotifier';
import { NotificationDocument } from '../persistence/mongo/NotificationDocument';

/** Saves the notification in the history. The push itself (FCM) comes at step 12. */
@Injectable()
export class MongoUserNotifierAdapter extends UserNotifier {
  constructor(@InjectModel(NotificationDocument.name) private readonly notifications: Model<NotificationDocument>) {
    super();
  }

  async notify(notification: NewNotification): Promise<void> {
    await this.notifications.create({ ...notification, lu: false });
  }
}
