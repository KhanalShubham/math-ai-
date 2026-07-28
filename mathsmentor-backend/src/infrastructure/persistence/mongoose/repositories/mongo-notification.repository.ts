import type { Types } from 'mongoose';
import { NotificationModel } from '../models/notification.model';
import { NotFoundError } from '../../../../errors';
import type { NotificationRepository } from '../../../../modules/notification/notification.repository.interface';
import type {
  FindByUserOptions,
  Notification,
  NewNotification,
  NotificationChannel,
  NotificationType,
} from '../../../../modules/notification/notification.types';

function toNotification(doc: {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt?: Date | null;
  deliveredVia: NotificationChannel[];
  createdAt: Date;
}): Notification {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    payload: doc.payload,
    readAt: doc.readAt ?? null,
    deliveredVia: doc.deliveredVia,
    createdAt: doc.createdAt,
  };
}

export class MongoNotificationRepository implements NotificationRepository {
  async create(notification: NewNotification): Promise<Notification> {
    const created = await NotificationModel.create({
      userId: notification.userId,
      type: notification.type,
      payload: notification.payload,
      deliveredVia: notification.deliveredVia,
    });
    return toNotification(created);
  }

  async findById(id: string): Promise<Notification | null> {
    const doc = await NotificationModel.findById(id).exec();
    return doc ? toNotification(doc) : null;
  }

  async findByUser(userId: string, options?: FindByUserOptions): Promise<Notification[]> {
    const filter: Record<string, unknown> = { userId };
    if (options?.unreadOnly) filter.readAt = null;

    const query = NotificationModel.find(filter).sort({ readAt: 1, createdAt: -1 });
    if (options?.limit) query.limit(options.limit);

    const docs = await query.exec();
    return docs.map(toNotification);
  }

  async markRead(id: string): Promise<Notification> {
    const updated = await NotificationModel.findByIdAndUpdate(
      id,
      { readAt: new Date() },
      { new: true },
    ).exec();
    if (!updated) {
      throw new NotFoundError('Notification not found');
    }
    return toNotification(updated);
  }

  async markAllReadForUser(userId: string): Promise<number> {
    const result = await NotificationModel.updateMany(
      { userId, readAt: null },
      { readAt: new Date() },
    ).exec();
    return result.modifiedCount;
  }
}
