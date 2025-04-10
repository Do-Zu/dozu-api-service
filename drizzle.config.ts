
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './drizzle',
  schema: './src/models',
  dialect: 'postgresql',
  dbCredentials: {
    // url: process.env.DATABASE_URL!,
    url: 'postgres://postgres:123456@localhost:5432/postgres',//todo:Actually use env
  },
});
