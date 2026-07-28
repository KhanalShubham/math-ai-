import { randomBytes } from 'node:crypto';
import { InProcessEventBus } from '../../src/infrastructure/events/in-process.event-bus';
import { createAuthService } from '../../src/modules/auth/auth.service';
import { generateOpaqueToken, hashToken } from '../../src/modules/auth/token.service';
import {
  AUTH_EVENTS,
  type PasswordResetRequestedPayload,
} from '../../src/modules/auth/auth.events';
import type {
  CreateRefreshTokenInput,
  CreateUserInput,
  CreateVerificationTokenInput,
  RefreshTokenRepository,
  UserRepository,
  VerificationTokenRepository,
} from '../../src/modules/auth/auth.repository.interface';
import type {
  RefreshToken,
  User,
  UserWithCredentials,
  VerificationToken,
  VerificationTokenType,
} from '../../src/modules/auth/auth.types';

function fakeId(): string {
  return randomBytes(12).toString('hex');
}

class FakeUserRepository implements UserRepository {
  private readonly users = new Map<string, UserWithCredentials>();

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
  }

  async findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    return [...this.users.values()].find((u) => u.email === email.toLowerCase()) ?? null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const id = fakeId();
    const user: UserWithCredentials = {
      id,
      email: input.email.toLowerCase(),
      role: input.role,
      status: 'active',
      emailVerifiedAt: null,
      lastLoginAt: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      passwordHash: input.passwordHash,
    };
    this.users.set(id, user);
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
  }

  async incrementFailedLogin(id: string): Promise<number> {
    const user = this.users.get(id);
    if (!user) return 0;
    user.failedLoginAttempts += 1;
    return user.failedLoginAttempts;
  }

  async resetFailedLoginAndRecordLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.failedLoginAttempts = 0;
      user.lastLoginAt = new Date();
    }
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const user = this.users.get(id);
    if (user) user.passwordHash = passwordHash;
  }

  async updateStatus(id: string, status: User['status']): Promise<void> {
    const user = this.users.get(id);
    if (user) user.status = status;
  }

  async markEmailVerified(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) user.emailVerifiedAt = new Date();
  }
}

class FakeVerificationTokenRepository implements VerificationTokenRepository {
  private readonly tokens = new Map<string, VerificationToken>();

  async create(input: CreateVerificationTokenInput): Promise<VerificationToken> {
    const token: VerificationToken = {
      id: fakeId(),
      userId: input.userId,
      type: input.type,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
    };
    this.tokens.set(token.id, token);
    return token;
  }

  async findValidByTokenHash(
    type: VerificationTokenType,
    tokenHash: string,
  ): Promise<VerificationToken | null> {
    const token = [...this.tokens.values()].find(
      (t) => t.type === type && t.tokenHash === tokenHash,
    );
    if (!token || token.usedAt || token.expiresAt < new Date()) return null;
    return token;
  }

  async markUsed(id: string): Promise<void> {
    const token = this.tokens.get(id);
    if (token) token.usedAt = new Date();
  }

  async invalidateAllForUser(userId: string, type: VerificationTokenType): Promise<void> {
    for (const token of this.tokens.values()) {
      if (token.userId === userId && token.type === type && !token.usedAt) {
        token.usedAt = new Date();
      }
    }
  }
}

class FakeRefreshTokenRepository implements RefreshTokenRepository {
  private readonly tokens = new Map<string, RefreshToken>();

  async create(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    const token: RefreshToken = {
      id: fakeId(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      replacedByTokenHash: null,
    };
    this.tokens.set(token.id, token);
    return token;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return [...this.tokens.values()].find((t) => t.tokenHash === tokenHash) ?? null;
  }

  async revoke(id: string, replacedByTokenHash?: string): Promise<void> {
    const token = this.tokens.get(id);
    if (token) {
      token.revokedAt = new Date();
      if (replacedByTokenHash) token.replacedByTokenHash = replacedByTokenHash;
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const token of this.tokens.values()) {
      if (token.userId === userId && !token.revokedAt) token.revokedAt = new Date();
    }
  }
}

function buildService() {
  const userRepository = new FakeUserRepository();
  const refreshTokenRepository = new FakeRefreshTokenRepository();
  const verificationTokenRepository = new FakeVerificationTokenRepository();
  const eventBus = new InProcessEventBus();
  const service = createAuthService({
    userRepository,
    refreshTokenRepository,
    verificationTokenRepository,
    eventBus,
  });
  return { service, userRepository, refreshTokenRepository, verificationTokenRepository, eventBus };
}

const NO_META = { userAgent: null, ipAddress: null };

describe('auth.service', () => {
  it('registers a new user and issues an email verification token', async () => {
    const { service } = buildService();
    const { user, emailVerificationToken } = await service.register(
      'Student@Example.com',
      'correct-horse-battery',
      'student',
    );

    expect(user.email).toBe('student@example.com');
    expect(user.role).toBe('student');
    expect(emailVerificationToken).toHaveLength(96);
  });

  it('rejects registering the same email twice', async () => {
    const { service } = buildService();
    await service.register('dup@example.com', 'correct-horse-battery', 'student');

    await expect(
      service.register('dup@example.com', 'another-password', 'student'),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('logs in with correct credentials and issues tokens', async () => {
    const { service } = buildService();
    await service.register('login@example.com', 'correct-horse-battery', 'student');

    const result = await service.login('login@example.com', 'correct-horse-battery', NO_META);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe('login@example.com');
  });

  it('rejects login with the wrong password without revealing which part was wrong', async () => {
    const { service } = buildService();
    await service.register('wrongpw@example.com', 'correct-horse-battery', 'student');

    await expect(
      service.login('wrongpw@example.com', 'not-the-password', NO_META),
    ).rejects.toMatchObject({ code: 'AUTHENTICATION_ERROR', message: 'Invalid email or password' });
  });

  it('locks the account after too many failed login attempts', async () => {
    const { service } = buildService();
    await service.register('locked@example.com', 'correct-horse-battery', 'student');

    for (let i = 0; i < 5; i++) {
      await service.login('locked@example.com', 'wrong', NO_META).catch(() => undefined);
    }

    await expect(
      service.login('locked@example.com', 'correct-horse-battery', NO_META),
    ).rejects.toMatchObject({ message: expect.stringContaining('locked') });
  });

  it('rejects login for an email that was never registered', async () => {
    const { service } = buildService();

    await expect(
      service.login('nobody@example.com', 'whatever-password', NO_META),
    ).rejects.toMatchObject({ code: 'AUTHENTICATION_ERROR', message: 'Invalid email or password' });
  });

  it('rejects login for a suspended account, even with the correct password', async () => {
    const { service, userRepository } = buildService();
    const { user } = await service.register(
      'suspended@example.com',
      'correct-horse-battery',
      'student',
    );
    await userRepository.updateStatus(user.id, 'suspended');

    await expect(
      service.login('suspended@example.com', 'correct-horse-battery', NO_META),
    ).rejects.toMatchObject({ code: 'AUTHENTICATION_ERROR' });
  });

  it('rejects login for a deleted account, even with the correct password', async () => {
    const { service, userRepository } = buildService();
    const { user } = await service.register(
      'deleted@example.com',
      'correct-horse-battery',
      'student',
    );
    await userRepository.updateStatus(user.id, 'deleted');

    await expect(
      service.login('deleted@example.com', 'correct-horse-battery', NO_META),
    ).rejects.toMatchObject({ code: 'AUTHENTICATION_ERROR' });
  });

  it('currently allows login before the email is verified (documented behavior, not yet enforced)', async () => {
    const { service } = buildService();
    await service.register('unverified@example.com', 'correct-horse-battery', 'student');

    await expect(
      service.login('unverified@example.com', 'correct-horse-battery', NO_META),
    ).resolves.toMatchObject({ user: { emailVerifiedAt: null } });
  });

  it('rejects a refresh with a token that was never issued', async () => {
    const { service } = buildService();

    await expect(service.refresh('not-a-real-refresh-token', NO_META)).rejects.toMatchObject({
      code: 'AUTHENTICATION_ERROR',
      message: 'Invalid refresh token',
    });
  });

  it('rejects a refresh with an expired token', async () => {
    const { service, refreshTokenRepository } = buildService();
    const { user } = await service.register(
      'expiredrefresh@example.com',
      'correct-horse-battery',
      'student',
    );
    const rawToken = generateOpaqueToken();
    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(service.refresh(rawToken, NO_META)).rejects.toMatchObject({
      code: 'AUTHENTICATION_ERROR',
      message: 'Refresh token expired',
    });
  });

  it('rotates the refresh token on refresh and invalidates the old one', async () => {
    const { service } = buildService();
    await service.register('rotate@example.com', 'correct-horse-battery', 'student');
    const { refreshToken: firstToken } = await service.login(
      'rotate@example.com',
      'correct-horse-battery',
      NO_META,
    );

    const { refreshToken: secondToken } = await service.refresh(firstToken, NO_META);
    expect(secondToken).not.toBe(firstToken);

    // Presenting the now-rotated-out token again must fail, not silently succeed.
    await expect(service.refresh(firstToken, NO_META)).rejects.toMatchObject({
      code: 'AUTHENTICATION_ERROR',
    });
  });

  it('revokes every session for a user when a rotated-out refresh token is reused (theft signal)', async () => {
    const { service, refreshTokenRepository } = buildService();
    await service.register('theft@example.com', 'correct-horse-battery', 'student');
    const { refreshToken: firstToken } = await service.login(
      'theft@example.com',
      'correct-horse-battery',
      NO_META,
    );
    const { refreshToken: secondToken } = await service.refresh(firstToken, NO_META);

    await expect(service.refresh(firstToken, NO_META)).rejects.toMatchObject({
      message: expect.stringContaining('reuse detected'),
    });

    // The legitimate, still-valid second token must ALSO be dead now.
    await expect(service.refresh(secondToken, NO_META)).rejects.toMatchObject({
      code: 'AUTHENTICATION_ERROR',
    });
    void refreshTokenRepository;
  });

  it('logs out by revoking the presented refresh token', async () => {
    const { service } = buildService();
    await service.register('logout@example.com', 'correct-horse-battery', 'student');
    const { refreshToken } = await service.login(
      'logout@example.com',
      'correct-horse-battery',
      NO_META,
    );

    await service.logout(refreshToken);

    await expect(service.refresh(refreshToken, NO_META)).rejects.toMatchObject({
      code: 'AUTHENTICATION_ERROR',
    });
  });

  it('treats a logged-out (revoked) token presented to refresh as reuse, not a plain 401', async () => {
    const { service } = buildService();
    await service.register('revoked@example.com', 'correct-horse-battery', 'student');
    const { refreshToken } = await service.login(
      'revoked@example.com',
      'correct-horse-battery',
      NO_META,
    );

    await service.logout(refreshToken);

    // Any revoked token presented again is treated as a theft signal, whether
    // it was revoked by rotation or by an explicit logout — see auth.service.refresh.
    await expect(service.refresh(refreshToken, NO_META)).rejects.toMatchObject({
      message: expect.stringContaining('reuse detected'),
    });
  });

  it('is idempotent when logging out twice with the same token', async () => {
    const { service } = buildService();
    await service.register('doublelogout@example.com', 'correct-horse-battery', 'student');
    const { refreshToken } = await service.login(
      'doublelogout@example.com',
      'correct-horse-battery',
      NO_META,
    );

    await expect(service.logout(refreshToken)).resolves.toBeUndefined();
    await expect(service.logout(refreshToken)).resolves.toBeUndefined();
  });

  it('logoutAllSessions revokes every session for that user, not just one', async () => {
    const { service } = buildService();
    await service.register('multisession@example.com', 'correct-horse-battery', 'student');
    const { user, refreshToken: sessionA } = await service.login(
      'multisession@example.com',
      'correct-horse-battery',
      NO_META,
    );
    const { refreshToken: sessionB } = await service.login(
      'multisession@example.com',
      'correct-horse-battery',
      NO_META,
    );

    await service.logoutAllSessions(user.id);

    await expect(service.refresh(sessionA, NO_META)).rejects.toMatchObject({
      code: 'AUTHENTICATION_ERROR',
    });
    await expect(service.refresh(sessionB, NO_META)).rejects.toMatchObject({
      code: 'AUTHENTICATION_ERROR',
    });
  });

  it('verifies an email with a valid token', async () => {
    const { service } = buildService();
    const { emailVerificationToken } = await service.register(
      'verify@example.com',
      'correct-horse-battery',
      'student',
    );

    await service.verifyEmail(emailVerificationToken);

    // No direct getter for verification state on the service — assert indirectly
    // by confirming a bogus token is rejected, proving the flow discriminates.
    await expect(service.verifyEmail('not-a-real-token')).rejects.toMatchObject({
      code: 'AUTHENTICATION_ERROR',
    });
  });

  it('does not reveal whether an email exists on password reset request', async () => {
    const { service } = buildService();
    await expect(service.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
  });

  it('resets a password and revokes all existing sessions', async () => {
    const { service, eventBus } = buildService();
    await service.register('reset@example.com', 'correct-horse-battery', 'student');
    const { refreshToken } = await service.login(
      'reset@example.com',
      'correct-horse-battery',
      NO_META,
    );

    // Capture the raw token the same way a real notification subscriber would
    // (ARCHITECTURE.md §21.1) — the service publishes it on PasswordResetRequested.
    let rawResetToken = '';
    eventBus.subscribe<PasswordResetRequestedPayload>(
      AUTH_EVENTS.PasswordResetRequested,
      async (event) => {
        rawResetToken = event.payload.rawToken;
      },
    );
    await service.requestPasswordReset('reset@example.com');
    expect(rawResetToken).toHaveLength(96);

    await service.resetPassword(rawResetToken, 'a-brand-new-password');

    await expect(service.refresh(refreshToken, NO_META)).rejects.toMatchObject({
      code: 'AUTHENTICATION_ERROR',
    });
    await expect(
      service.login('reset@example.com', 'a-brand-new-password', NO_META),
    ).resolves.toMatchObject({ user: { email: 'reset@example.com' } });
  });

  it('rejects a password reset with a token that was never issued', async () => {
    const { service } = buildService();

    await expect(
      service.resetPassword('not-a-real-reset-token', 'a-brand-new-password'),
    ).rejects.toMatchObject({
      code: 'AUTHENTICATION_ERROR',
      message: 'Invalid or expired reset token',
    });
  });

  it('rejects a password reset with an expired token', async () => {
    const { service, verificationTokenRepository } = buildService();
    const { user } = await service.register(
      'expiredreset@example.com',
      'correct-horse-battery',
      'student',
    );
    const rawToken = generateOpaqueToken();
    await verificationTokenRepository.create({
      userId: user.id,
      type: 'password_reset',
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(service.resetPassword(rawToken, 'a-brand-new-password')).rejects.toMatchObject({
      code: 'AUTHENTICATION_ERROR',
    });
  });

  it('rejects reusing a password reset token a second time', async () => {
    const { service, eventBus } = buildService();
    await service.register('reusereset@example.com', 'correct-horse-battery', 'student');

    let rawResetToken = '';
    eventBus.subscribe<PasswordResetRequestedPayload>(
      AUTH_EVENTS.PasswordResetRequested,
      async (event) => {
        rawResetToken = event.payload.rawToken;
      },
    );
    await service.requestPasswordReset('reusereset@example.com');

    await service.resetPassword(rawResetToken, 'first-new-password');

    await expect(service.resetPassword(rawResetToken, 'second-new-password')).rejects.toMatchObject(
      { code: 'AUTHENTICATION_ERROR' },
    );
  });
});
