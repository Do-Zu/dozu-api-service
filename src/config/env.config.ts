import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

const rootPath = path.resolve(__dirname, '../../');

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
const envPath = path.resolve(rootPath, envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({
    path: envPath,
  });
} else {
  console.warn(`Environment file ${envFile} not found, using default values`);
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    host: process.env.HOST || 'localhost',
  },
};
