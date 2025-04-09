import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import { dbConfig } from '@/config/db.config';
import * as schema from '@/models/index';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export const getDb = () => {
  if (!dbInstance) {
    const pool = new Pool({
      connectionString: dbConfig.connectionString,
      ssl: dbConfig.ssl,
    });

    dbInstance = drizzle(pool, { schema });
  }

  return dbInstance;
};
