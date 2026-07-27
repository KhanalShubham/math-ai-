import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors';
import { logger } from '../infrastructure/logging/logger';

/**
 * Registered last in app.ts. The ONLY place that maps an error to an HTTP
 * response and decides what's safe to leak to the client (ARCHITECTURE.md §7).
 */
export function errorHandlerMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, code: err.code }, 'Non-operational error');
    } else {
      logger.warn({ code: err.code, details: err.details }, err.message);
    }

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
}

/** Wraps an async route/controller so a rejected promise reaches errorHandlerMiddleware via next(). */
export function asyncHandler<Req extends Request = Request, Res extends Response = Response>(
  fn: (req: Req, res: Res, next: NextFunction) => Promise<void>,
) {
  return (req: Req, res: Res, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
