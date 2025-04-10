import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@/models/index';
import { dbConfig } from '@/config/db.config';
import logger from '@/utils/logger';
import { config } from '@/config/env.config';

const { Pool } = pg;

export type Database = NodePgDatabase<typeof schema>;

let dbInstance: Database | null = null;

let pool: pg.Pool | null = null;

/**
 * Creates Pool for manager connections to the database.
 * @returns {pg.Pool} - The pool instance.
 */
const createPool = (): pg.Pool => {
  if (pool) return pool;

  const newPool = new Pool({
    connectionString: dbConfig.connectionString,
    ssl: dbConfig.ssl,
    max: dbConfig.maxConnections,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
  });

  // Error event handler
  newPool.on('error', err => {
    logger.error('Unexpected error on PostgreSQL client', { error: err.message });
  });

  // Connection handling for diagnostics
  if (config.isDevelopment) {
    newPool.on('connect', () => {
      logger.debug('PostgreSQL pool new connection');
    });

    newPool.on('acquire', () => {
      logger.debug(
        `PostgreSQL pool connection acquired, total: ${newPool.totalCount}, idle: ${newPool.idleCount}`
      );
    });

    newPool.on('remove', () => {
      logger.debug('PostgreSQL pool connection removed');
    });
  }

  return newPool;
};

/**
 * Gets a database instance using singleton pattern
 */
export const getDb = () => {
  try {
    if (dbInstance) return dbInstance;

    if (!pool) {
      pool = createPool();
    }

    dbInstance = drizzle(pool, { schema });

    console.log('PostgreSQL database connection success', { dbInstance });
    logger.info('PostgreSQL database connection initialized');
  } catch (error) {
    logger.error('Failed to initialize database connection', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Gracefully shuts down the database connection pool
 */
export const closeDb = async (): Promise<void> => {
  if (pool) {
    try {
      await pool.end();
      dbInstance = null;
      pool = null;
      logger.info('PostgreSQL connection pool closed');
    } catch (error) {
      logger.error('Error closing PostgreSQL connection pool', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};

export function getDbInstance(): Database {
  if (!dbInstance) {
    getDb();
  }

  if (!dbInstance) {
    throw new Error('Database initialization failed');
  }

  return dbInstance;
}

// Handle application shutdown
// process.on('SIGINT', async () => {
//   logger.info('SIGINT received, closing database connections...');
//   await closeDb();
//   process.exit(0);
// });

// process.on('SIGTERM', async () => {
//   logger.info('SIGTERM received, closing database connections...');
//   await closeDb();
//   process.exit(0);
// });

const db = getDbInstance();

export default db;
