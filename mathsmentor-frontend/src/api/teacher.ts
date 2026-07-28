import { apiRequest } from './client';

export interface TeacherProfile {
  id: string;
  userId: string;
  schoolId: string;
  classIds: string[];
  subjects: string[];
}

export interface MembershipHistoryEntry {
  studentId: string;
  joinedAt: string;
  leftAt: string | null;
}

export interface ClassGroup {
  id: string;
  schoolId: string;
  name: string;
  examBoard: string;
  tier: 'foundation' | 'higher';
  teacherIds: string[];
  activeStudentIds: string[];
  membershipHistory: MembershipHistoryEntry[];
  academicYear: string;
}

export function createMyProfile(token: string, input: { schoolId: string; subjects: string[] }) {
  return apiRequest<{ teacher: TeacherProfile }>('/teacher/profile', {
    method: 'POST',
    body: input,
    token,
  });
}

export function getMyProfile(token: string) {
  return apiRequest<{ teacher: TeacherProfile }>('/teacher/profile', { token });
}

export function createClass(
  token: string,
  input: { schoolId: string; name: string; examBoard: string; tier: 'foundation' | 'higher'; academicYear: string },
) {
  return apiRequest<{ class: ClassGroup }>('/teacher/classes', { method: 'POST', body: input, token });
}

export function listMyClasses(token: string) {
  return apiRequest<{ classes: ClassGroup[] }>('/teacher/classes', { token });
}

export function getClass(token: string, classId: string) {
  return apiRequest<{ class: ClassGroup }>(`/teacher/classes/${classId}`, { token });
}

export function enrollStudent(token: string, classId: string, studentId: string) {
  return apiRequest<{ class: ClassGroup }>(`/teacher/classes/${classId}/students`, {
    method: 'POST',
    body: { studentId },
    token,
  });
}

export function withdrawStudent(token: string, classId: string, studentId: string) {
  return apiRequest<{ class: ClassGroup }>(`/teacher/classes/${classId}/students/${studentId}`, {
    method: 'DELETE',
    token,
  });
}
