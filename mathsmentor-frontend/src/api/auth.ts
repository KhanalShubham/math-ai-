import { apiRequest } from './client';

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  emailVerifiedAt: string | null;
}

export function register(input: { email: string; password: string; role: 'student' | 'teacher' | 'parent' }) {
  return apiRequest<{ user: PublicUser }>('/auth/register', { method: 'POST', body: input });
}

export function login(input: { email: string; password: string }) {
  return apiRequest<{ user: PublicUser; accessToken: string }>('/auth/login', {
    method: 'POST',
    body: input,
  });
}

export function logout(token: string) {
  return apiRequest<void>('/auth/logout', { method: 'POST', token });
}
