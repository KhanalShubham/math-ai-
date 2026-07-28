import { apiRequest } from './client';

export interface Notification {
  id: string;
  type: 'streak_reminder' | 'weekly_report' | 'assignment_due' | 'mastery_milestone';
  payload: Record<string, unknown>;
  readAt: string | null;
  deliveredVia: ('in_app' | 'email')[];
  createdAt: string;
}

export function listMyNotifications(token: string, options?: { unreadOnly?: boolean }) {
  return apiRequest<{ notifications: Notification[] }>('/notifications', {
    token,
    query: options?.unreadOnly ? { unreadOnly: true } : undefined,
  });
}

export function markRead(token: string, notificationId: string) {
  return apiRequest<{ notification: Notification }>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  });
}

export function markAllRead(token: string) {
  return apiRequest<{ updatedCount: number }>('/notifications/read-all', {
    method: 'PATCH',
    token,
  });
}
