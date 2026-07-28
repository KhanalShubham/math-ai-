import type { FindByUserOptions, NewNotification, Notification } from './notification.types';

/**
 * Owned by `notification` (DOMAIN_MODEL.md §2.12). `create` is the ONLY
 * write path for new notifications, and by convention (same as
 * MasteryRepository/AnalyticsEventRepository) it must only ever be called
 * from notification.service's event handlers, never from a controller —
 * every Notification is a reaction to something that happened elsewhere.
 */
export interface NotificationRepository {
  create(notification: NewNotification): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByUser(userId: string, options?: FindByUserOptions): Promise<Notification[]>;
  /** Throws NotFoundError if the notification doesn't exist. */
  markRead(id: string): Promise<Notification>;
  /** Returns the number of notifications updated. */
  markAllReadForUser(userId: string): Promise<number>;
}
