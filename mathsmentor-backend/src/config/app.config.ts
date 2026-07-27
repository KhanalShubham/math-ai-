import { env } from './env';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  corsAllowedOrigins: string[];
}

export const appConfig: Readonly<AppConfig> = Object.freeze({
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),
});
