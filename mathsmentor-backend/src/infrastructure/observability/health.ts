import type { Request, Response } from 'express';

/** Liveness only — is the process up and able to respond. No dependency checks. */
export function healthHandler(_req: Request, res: Response): void {
  res.status(200).json({ status: 'ok' });
}
