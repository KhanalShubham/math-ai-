export type NotificationType =
  | 'streak_reminder'
  | 'weekly_report'
  | 'assignment_due'
  | 'mastery_milestone';

export type NotificationChannel = 'in_app' | 'email';

/** Plain domain shape — never the Mongoose document (DOMAIN_MODEL.md §2.12). */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: Date | null;
  deliveredVia: NotificationChannel[];
  createdAt: Date;
}

export interface NewNotification {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  deliveredVia: NotificationChannel[];
}

export interface FindByUserOptions {
  unreadOnly?: boolean;
  limit?: number;
}
