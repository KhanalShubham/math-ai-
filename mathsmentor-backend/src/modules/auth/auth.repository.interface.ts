import type { RefreshToken, User, UserRole, UserStatus, UserWithCredentials } from './auth.types';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  role: UserRole;
}

/**
 * Owned by this module (ARCHITECTURE.md §21.2). The Mongoose implementation
 * lives in infrastructure/persistence/mongoose/repositories/ — auth.service
 * depends on this interface only, never on Mongoose.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null>;
  create(input: CreateUserInput): Promise<User>;
  incrementFailedLogin(id: string): Promise<number>;
  resetFailedLoginAndRecordLogin(id: string): Promise<void>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  updateStatus(id: string, status: UserStatus): Promise<void>;

  setEmailVerificationToken(id: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findByEmailVerificationTokenHash(tokenHash: string): Promise<User | null>;
  markEmailVerified(id: string): Promise<void>;

  setPasswordResetToken(id: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findByPasswordResetTokenHash(tokenHash: string): Promise<User | null>;
  clearPasswordResetToken(id: string): Promise<void>;
}

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface RefreshTokenRepository {
  create(input: CreateRefreshTokenInput): Promise<RefreshToken>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revoke(id: string, replacedByTokenHash?: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
