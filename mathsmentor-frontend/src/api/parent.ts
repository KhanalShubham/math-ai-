import { apiRequest } from './client';

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
}

export interface ParentProfile {
  id: string;
  userId: string;
  verifiedStudentIds: string[];
  notificationPreferences: NotificationPreferences;
}

export interface Child {
  id: string;
  displayName: string;
  examBoard: string;
  tier: 'foundation' | 'higher';
  currentEstimatedGrade: number | null;
}

export function createMyProfile(token: string) {
  return apiRequest<{ parent: ParentProfile }>('/parent/profile', { method: 'POST', token });
}

export function getMyProfile(token: string) {
  return apiRequest<{ parent: ParentProfile }>('/parent/profile', { token });
}

export function linkStudent(token: string, studentEmail: string) {
  return apiRequest<{ parent: ParentProfile }>('/parent/links', {
    method: 'POST',
    body: { studentEmail },
    token,
  });
}

export function unlinkStudent(token: string, studentId: string) {
  return apiRequest<{ parent: ParentProfile }>(`/parent/links/${studentId}`, {
    method: 'DELETE',
    token,
  });
}

export function getMyChildren(token: string) {
  return apiRequest<{ children: Child[] }>('/parent/children', { token });
}

export function updateMyNotificationPreferences(
  token: string,
  patch: Partial<NotificationPreferences>,
) {
  return apiRequest<{ parent: ParentProfile }>('/parent/preferences', {
    method: 'PATCH',
    body: patch,
    token,
  });
}
