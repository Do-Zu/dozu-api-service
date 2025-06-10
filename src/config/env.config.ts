import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import logger from '../utils/logger';

const isDevelopment = process.env.NODE_ENV !== 'production';
const environment = process.env.NODE_ENV || 'development';

const rootPath = path.resolve(__dirname, '../../');

const envFile = isDevelopment ? '.env.development' : '.env.production';
const envPath = path.resolve(rootPath, envFile);

try {
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({
      path: envPath,
    });

    if (result.error) {
      throw result.error;
    }

    logger.info(`Loaded environment from ${envFile}`);
  } else {
    logger.warn(`Environment file ${envFile} not found, using default values`);
  }
} catch (error) {
  logger.error(`Error loading environment: ${(error as Error).message}`);
}

// Validate required environment variables
const requiredEnvVars: string[] = ['PORT', 'HOST'];

const missingEnvVars = requiredEnvVars.filter(name => !process.env[name]);

if (missingEnvVars.length > 0) {
  logger.warn(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

interface ServerConfig {
  port: number;
  host: string;
}

interface AppConfig {
  env: string;
  server: ServerConfig;
  isProduction: boolean;
  isDevelopment: boolean;
}

export const config: AppConfig = {
  env: environment,
  isProduction: environment === 'production',
  isDevelopment: environment === 'development',
  server: {
    port: parseInt(process.env.PORT || '3333', 10),
    host: process.env.HOST || 'localhost',
  },
};
