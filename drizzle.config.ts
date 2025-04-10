import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const env = process.env.NODE_ENV || 'development';
const envPath = path.resolve(process.cwd(), `.env${env !== 'development' ? '.' + env : ''}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const name_db = 'dozu';
const databaseUrl =
  process.env.DATABASE_URL || `postgres://postgres:123456@localhost:5432/${name_db}`;

export default defineConfig({
  out: './drizzle',
  schema: './src/models',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
