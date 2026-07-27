import { env } from './env';

export type StorageProvider = 'local' | 's3';

export interface StorageConfig {
  provider: StorageProvider;
  localDir: string;
}

export const storageConfig: Readonly<StorageConfig> = Object.freeze({
  provider: env.STORAGE_PROVIDER,
  localDir: env.STORAGE_LOCAL_DIR,
});
