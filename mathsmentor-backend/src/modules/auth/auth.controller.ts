import type { Request, Response } from 'express';
import { appConfig } from '../../config';
import { AuthenticationError } from '../../errors';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import type { AuthService } from './auth.service';
import type {
  LoginInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.validation';
import type { User } from './auth.types';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

function setRefreshCookie(res: Response, rawRefreshToken: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    secure: appConfig.nodeEnv === 'production',
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  });
}

function requestMeta(req: Request) {
  return {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  };
}

export function createAuthController(authService: AuthService) {
  return {
    register: asyncHandler(async (req: Request, res: Response) => {
      const { email, password, role } = req.body as RegisterInput;
      const { user, emailVerificationToken } = await authService.register(email, password, role);

      res.status(201).json({
        user: toPublicUser(user),
        // Dev/test convenience only — a real email module (Phase 9) sends this, it's never returned in prod.
        ...(appConfig.nodeEnv !== 'production' ? { emailVerificationToken } : {}),
      });
    }),

    login: asyncHandler(async (req: Request, res: Response) => {
      const { email, password } = req.body as LoginInput;
      const { user, accessToken, refreshToken, refreshTokenExpiresAt } = await authService.login(
        email,
        password,
        requestMeta(req),
      );

      setRefreshCookie(res, refreshToken, refreshTokenExpiresAt);
      res.status(200).json({ user: toPublicUser(user), accessToken });
    }),

    refresh: asyncHandler(async (req: Request, res: Response) => {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
      if (!rawRefreshToken) {
        throw new AuthenticationError('Missing refresh token');
      }

      const { accessToken, refreshToken, refreshTokenExpiresAt } = await authService.refresh(
        rawRefreshToken,
        requestMeta(req),
      );

      setRefreshCookie(res, refreshToken, refreshTokenExpiresAt);
      res.status(200).json({ accessToken });
    }),

    logout: asyncHandler(async (req: Request, res: Response) => {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
      if (rawRefreshToken) {
        await authService.logout(rawRefreshToken);
      }
      res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
      res.status(204).send();
    }),

    logoutAll: asyncHandler(async (req: Request, res: Response) => {
      // requireAuth guarantees req.user here — see auth.routes.ts.
      await authService.logoutAllSessions(req.user!.sub);
      res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
      res.status(204).send();
    }),

    verifyEmail: asyncHandler(async (req: Request, res: Response) => {
      const { token } = req.body as VerifyEmailInput;
      await authService.verifyEmail(token);
      res.status(200).json({ message: 'Email verified' });
    }),

    requestPasswordReset: asyncHandler(async (req: Request, res: Response) => {
      const { email } = req.body as RequestPasswordResetInput;
      await authService.requestPasswordReset(email);
      // Same response whether or not the email exists — see auth.service.requestPasswordReset.
      res.status(200).json({ message: 'If that email exists, a reset link has been sent' });
    }),

    resetPassword: asyncHandler(async (req: Request, res: Response) => {
      const { token, newPassword } = req.body as ResetPasswordInput;
      await authService.resetPassword(token, newPassword);
      res.status(200).json({ message: 'Password reset successful' });
    }),

    me: asyncHandler((req: Request, res: Response) => {
      res.status(200).json({ user: req.user });
      return Promise.resolve();
    }),
  };
}
