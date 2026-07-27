import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  AI_PROVIDER: z.enum(['ollama', 'openai', 'claude', 'gemini']).default('ollama'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5'),

  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./uploads'),
});

type Env = z.infer<typeof envSchema>;

/**
 * Parsed and validated once at process start. Fail fast on boot rather than
 * discovering a missing/malformed variable mid-request (ARCHITECTURE.md §9/§10).
 * Nothing outside src/config/ should read process.env directly.
 */
function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:\n', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env: Readonly<Env> = Object.freeze(loadEnv());
