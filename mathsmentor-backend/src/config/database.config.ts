import { env } from './env';

export interface DatabaseConfig {
  uri: string;
}

export const databaseConfig: Readonly<DatabaseConfig> = Object.freeze({
  uri: env.MONGO_URI,
});
