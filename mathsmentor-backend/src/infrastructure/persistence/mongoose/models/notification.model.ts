import { Schema, model, type InferSchemaType } from 'mongoose';
import type { NotificationChannel, NotificationType } from '../../../../modules/notification/notification.types';

const NOTIFICATION_TYPES: NotificationType[] = [
  'streak_reminder',
  'weekly_report',
  'assignment_due',
  'mastery_milestone',
];
const NOTIFICATION_CHANNELS: NotificationChannel[] = ['in_app', 'email'];

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    payload: { type: Schema.Types.Mixed, required: true, default: {} },
    readAt: { type: Date, default: null },
    deliveredVia: { type: [String], enum: NOTIFICATION_CHANNELS, required: true, default: ['in_app'] },
  },
  { timestamps: true },
);

// Unread-first inbox query (DOMAIN_MODEL.md §2.12) — null sorts before any
// Date in MongoDB's ascending BSON type ordering, so readAt:1 puts unread
// notifications first, then oldest-read-first among the rest.
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;
export const NotificationModel = model('Notification', notificationSchema);
