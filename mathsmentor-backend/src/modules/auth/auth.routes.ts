import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authRateLimiter } from '../../middleware/rate-limit.middleware';
import { requireAuth } from './auth.middleware';
import { createAuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validation';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const controller = createAuthController(authService);

  router.post('/register', validate(registerSchema), controller.register);
  router.post('/login', authRateLimiter, validate(loginSchema), controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.post('/logout-all', requireAuth, controller.logoutAll);
  router.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail);
  router.post(
    '/request-password-reset',
    authRateLimiter,
    validate(requestPasswordResetSchema),
    controller.requestPasswordReset,
  );
  router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);
  router.get('/me', requireAuth, controller.me);

  return router;
}
