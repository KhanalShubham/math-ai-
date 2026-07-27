import type { NextFunction, Request, Response } from 'express';
import { AuthenticationError, AuthorizationError } from '../../errors';
import { verifyAccessToken } from './token.service';
import type { UserRole } from './auth.types';

/** Verifies the access token and attaches req.user. Distinct from requireRole — "who are you" vs "are you allowed" (ARCHITECTURE.md §16). */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AuthenticationError('Missing or malformed Authorization header'));
    return;
  }

  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError('Authentication required'));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new AuthorizationError('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}
