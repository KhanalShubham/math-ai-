import pino from 'pino';
import { appConfig } from '../../config';
import { getRequestId } from './request-context';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
];

export const logger = pino({
  level: appConfig.logLevel,
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  mixin() {
    const requestId = getRequestId();
    return requestId ? { requestId } : {};
  },
  transport:
    appConfig.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
});
