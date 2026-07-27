import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithRequestContext } from '../infrastructure/logging/request-context';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
  }
}

const REQUEST_ID_HEADER = 'x-request-id';

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers[REQUEST_ID_HEADER] as string | undefined) ?? randomUUID();
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  runWithRequestContext({ requestId }, next);
}
