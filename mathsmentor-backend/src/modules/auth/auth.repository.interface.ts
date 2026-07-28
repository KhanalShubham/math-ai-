import type {
  RefreshToken,
  User,
  UserRole,
  UserStatus,
  UserWithCredentials,
  VerificationToken,
  VerificationTokenType,
} from './auth.types';

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
  markEmailVerified(id: string): Promise<void>;
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

export interface CreateVerificationTokenInput {
  userId: string;
  type: VerificationTokenType;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Backs email verification, password reset, and future flows (magic links,
 * invitations) with one collection instead of a growing set of token fields
 * on User (ARCHITECTURE.md §21.2 review — one active token per user/type is
 * enforced by invalidating prior tokens of that type on creation).
 */
export interface VerificationTokenRepository {
  create(input: CreateVerificationTokenInput): Promise<VerificationToken>;
  findValidByTokenHash(
    type: VerificationTokenType,
    tokenHash: string,
  ): Promise<VerificationToken | null>;
  markUsed(id: string): Promise<void>;
  invalidateAllForUser(userId: string, type: VerificationTokenType): Promise<void>;
}
