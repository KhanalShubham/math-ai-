export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';
export type UserStatus = 'invited' | 'active' | 'suspended' | 'deleted';

/** Plain domain shape — never the Mongoose document. Services and controllers see only this. */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
  createdAt: Date;
}

/** Internal-only projection that includes the password hash — never leaves auth.service. */
export interface UserWithCredentials extends User {
  passwordHash: string;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenHash: string | null;
}

export interface JwtAccessPayload {
  sub: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtAccessPayload;
  }
}
