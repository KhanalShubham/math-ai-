export const AUTH_EVENTS = {
  UserRegistered: 'auth.UserRegistered',
  UserLoggedIn: 'auth.UserLoggedIn',
  PasswordResetRequested: 'auth.PasswordResetRequested',
  PasswordChanged: 'auth.PasswordChanged',
} as const;

export interface UserRegisteredPayload {
  userId: string;
  email: string;
}

export interface PasswordResetRequestedPayload {
  userId: string;
  email: string;
  rawToken: string;
}
