import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../errors';

type ValidatableSegment = 'body' | 'query' | 'params';

/**
 * Validates a request segment against a zod schema BEFORE the controller runs.
 * Controllers only ever see already-validated, already-typed data — no manual
 * `if (!req.body.x)` checks in business code (ARCHITECTURE.md §11).
 */
export function validate<T>(schema: ZodSchema<T>, segment: ValidatableSegment = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[segment]);
    if (!result.success) {
      next(new ValidationError('Request validation failed', result.error.flatten()));
      return;
    }
    req[segment] = result.data;
    next();
  };
}
