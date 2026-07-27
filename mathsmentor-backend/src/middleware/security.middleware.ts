import cors from 'cors';
import helmet from 'helmet';
import type { RequestHandler } from 'express';
import { appConfig } from '../config';

export const helmetMiddleware: RequestHandler = helmet();

export const corsMiddleware: RequestHandler = cors({
  origin: appConfig.corsAllowedOrigins,
  credentials: true,
});
