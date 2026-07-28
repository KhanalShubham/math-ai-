import { logger } from '../../infrastructure/logging/logger';
import type { EventBus } from '../../infrastructure/events/event-bus.interface';
import { AuthenticationError, ConflictError } from '../../errors';
import type {
  RefreshTokenRepository,
  UserRepository,
  VerificationTokenRepository,
} from './auth.repository.interface';
import type { AuthTokens, User, UserRole } from './auth.types';
import { hashPassword, verifyPassword } from './password';
import {
  generateOpaqueToken,
  hashToken,
  refreshTokenExpiryDate,
  signAccessToken,
} from './token.service';
import { AUTH_EVENTS } from './auth.events';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export interface RequestMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface AuthService {
  register(
    email: string,
    password: string,
    role: UserRole,
  ): Promise<{ user: User; emailVerificationToken: string }>;
  login(email: string, password: string, meta: RequestMeta): Promise<{ user: User } & AuthTokens>;
  refresh(rawRefreshToken: string, meta: RequestMeta): Promise<AuthTokens>;
  logout(rawRefreshToken: string): Promise<void>;
  logoutAllSessions(userId: string): Promise<void>;
  verifyEmail(rawToken: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(rawToken: string, newPassword: string): Promise<void>;
}

export interface AuthServiceDeps {
  userRepository: UserRepository;
  refreshTokenRepository: RefreshTokenRepository;
  verificationTokenRepository: VerificationTokenRepository;
  eventBus: EventBus;
}

async function issueTokens(
  deps: AuthServiceDeps,
  user: User,
  meta: RequestMeta,
): Promise<AuthTokens> {
  const rawRefreshToken = generateOpaqueToken();
  const refreshTokenExpiresAt = refreshTokenExpiryDate();

  await deps.refreshTokenRepository.create({
    userId: user.id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: refreshTokenExpiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    refreshToken: rawRefreshToken,
    refreshTokenExpiresAt,
  };
}

export function createAuthService(deps: AuthServiceDeps): AuthService {
  return {
    async register(email, password, role) {
      const existing = await deps.userRepository.findByEmailWithCredentials(email);
      if (existing) {
        throw new ConflictError('An account with this email already exists');
      }

      const passwordHash = await hashPassword(password);
      const user = await deps.userRepository.create({ email, passwordHash, role });

      const rawToken = generateOpaqueToken();
      await deps.verificationTokenRepository.create({
        userId: user.id,
        type: 'email_verification',
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      });

      // Phase 9 (notification module) will subscribe to this and actually send mail.
      logger.info({ userId: user.id, email: user.email }, 'Would send verification email');
      await deps.eventBus.publish(AUTH_EVENTS.UserRegistered, {
        userId: user.id,
        email: user.email,
      });

      return { user, emailVerificationToken: rawToken };
    },

    async login(email, password, meta) {
      const existing = await deps.userRepository.findByEmailWithCredentials(email);
      if (!existing) {
        throw new AuthenticationError('Invalid email or password');
      }
      if (existing.status !== 'active' && existing.status !== 'invited') {
        throw new AuthenticationError('This account cannot sign in');
      }
      if (existing.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        throw new AuthenticationError('Account temporarily locked after too many failed attempts');
      }

      const passwordMatches = await verifyPassword(password, existing.passwordHash);
      if (!passwordMatches) {
        await deps.userRepository.incrementFailedLogin(existing.id);
        throw new AuthenticationError('Invalid email or password');
      }

      await deps.userRepository.resetFailedLoginAndRecordLogin(existing.id);
      const { passwordHash: _passwordHash, ...user } = existing;

      const tokens = await issueTokens(deps, user, meta);
      await deps.eventBus.publish(AUTH_EVENTS.UserLoggedIn, { userId: user.id });

      return { user, ...tokens };
    },

    async refresh(rawRefreshToken, meta) {
      const tokenHash = hashToken(rawRefreshToken);
      const existing = await deps.refreshTokenRepository.findByTokenHash(tokenHash);
      if (!existing) {
        throw new AuthenticationError('Invalid refresh token');
      }
      if (existing.revokedAt) {
        // A revoked token being presented again means it was stolen and used
        // by someone else after the legitimate rotation — revoke the whole
        // chain defensively (DOMAIN_MODEL.md §2.14 theft-detection design).
        logger.warn({ userId: existing.userId }, 'Refresh token reuse detected; revoking session');
        await deps.refreshTokenRepository.revokeAllForUser(existing.userId);
        throw new AuthenticationError('Refresh token reuse detected; all sessions revoked');
      }
      if (existing.expiresAt.getTime() < Date.now()) {
        throw new AuthenticationError('Refresh token expired');
      }

      const user = await deps.userRepository.findById(existing.userId);
      if (!user || user.status !== 'active') {
        throw new AuthenticationError('Account no longer active');
      }

      const tokens = await issueTokens(deps, user, meta);
      await deps.refreshTokenRepository.revoke(existing.id, hashToken(tokens.refreshToken));

      return tokens;
    },

    async logout(rawRefreshToken) {
      const existing = await deps.refreshTokenRepository.findByTokenHash(
        hashToken(rawRefreshToken),
      );
      if (existing && !existing.revokedAt) {
        await deps.refreshTokenRepository.revoke(existing.id);
      }
    },

    async logoutAllSessions(userId) {
      await deps.refreshTokenRepository.revokeAllForUser(userId);
    },

    async verifyEmail(rawToken) {
      const token = await deps.verificationTokenRepository.findValidByTokenHash(
        'email_verification',
        hashToken(rawToken),
      );
      if (!token) {
        throw new AuthenticationError('Invalid or expired verification token');
      }
      await deps.verificationTokenRepository.markUsed(token.id);
      await deps.userRepository.markEmailVerified(token.userId);
    },

    async requestPasswordReset(email) {
      const existing = await deps.userRepository.findByEmailWithCredentials(email);
      if (!existing) {
        // Deliberately no error — responding identically whether the email
        // exists avoids leaking which addresses have accounts.
        return;
      }

      const rawToken = generateOpaqueToken();
      await deps.verificationTokenRepository.invalidateAllForUser(existing.id, 'password_reset');
      await deps.verificationTokenRepository.create({
        userId: existing.id,
        type: 'password_reset',
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      });

      logger.info({ userId: existing.id }, 'Would send password reset email');
      await deps.eventBus.publish(AUTH_EVENTS.PasswordResetRequested, {
        userId: existing.id,
        email: existing.email,
        rawToken,
      });
    },

    async resetPassword(rawToken, newPassword) {
      const token = await deps.verificationTokenRepository.findValidByTokenHash(
        'password_reset',
        hashToken(rawToken),
      );
      if (!token) {
        throw new AuthenticationError('Invalid or expired reset token');
      }

      const passwordHash = await hashPassword(newPassword);
      await deps.userRepository.updatePassword(token.userId, passwordHash);
      await deps.verificationTokenRepository.markUsed(token.id);
      // Force re-login everywhere — a leaked/guessed old session should not
      // survive a password reset.
      await deps.refreshTokenRepository.revokeAllForUser(token.userId);
      await deps.eventBus.publish(AUTH_EVENTS.PasswordChanged, { userId: token.userId });
    },
  };
}
