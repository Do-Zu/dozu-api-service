import dotenv from 'dotenv';
import path from 'node:path';
import * as fs from 'fs';
import logger from '../utils/logger';

type AppEnvironment = 'development' | 'stage' | 'production';

const environment = (process.env.NODE_ENV as AppEnvironment) || 'development';
const isProduction = environment === 'production';
const isStage = environment === 'stage';
const isDevelopment = environment === 'development';

const rootPath = path.resolve(__dirname, '../../');

const envFile = isProduction ? '.env.production' : isStage ? '.env.stage' : '.env.development';
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

function getEnv(name: string): string | undefined {
    const v = process.env[name];
    const trimmed = typeof v === 'string' ? v.trim() : v;
    if (!trimmed || trimmed.length === 0) return undefined;
    return trimmed;
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
    allowedOrigins: string[];
    isProduction: boolean;
    isDevelopment: boolean;
    isStage: boolean;
    trustProxy: boolean | number;
}

const allowedOrigins =
    getEnv('ALLOWED_ORIGINS')
        ?.split(',')
        ?.map(origin => origin.trim())
        .filter(Boolean) ?? [];

if (allowedOrigins.length === 0) {
    logger.warn('ALLOWED_ORIGINS is empty. CORS may block all cross-origin requests.');
}

export const config: AppConfig = {
    env: environment,
    isProduction,
    isDevelopment,
    isStage,
    server: {
        port: parseInt(process.env.PORT || '3333', 10),
        host: process.env.HOST || 'localhost',
    },
    allowedOrigins,
    // Trust proxy configuration for rate limiting and IP detection
    // Can be configured via TRUST_PROXY environment variable
    // Values: 'true', 'false', or a number (e.g., '1' to trust first proxy)
    trustProxy: process.env.TRUST_PROXY
        ? process.env.TRUST_PROXY === 'true'
            ? true
            : process.env.TRUST_PROXY === 'false'
              ? false
              : parseInt(process.env.TRUST_PROXY, 10)
        : environment === 'production' || environment === 'stage'
          ? 1
          : true,
};

export { getEnv };
