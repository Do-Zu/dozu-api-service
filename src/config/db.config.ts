import { config } from '@/config/env.config';
import logger from '@/utils/logger';

export interface IDatabaseConfig {
  connectionString: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

// Log if DATABASE_URL is missing
if (!process.env.DATABASE_URL) {
  logger.warn('DATABASE_URL environment variable is not set');
}

const productionConfig: IDatabaseConfig = {
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
  maxConnections: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const developmentConfig: IDatabaseConfig = {
  connectionString: process.env.DATABASE_URL!,
  ssl: false,
  maxConnections: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const dbConfig: IDatabaseConfig = config.isProduction ? productionConfig : developmentConfig;
