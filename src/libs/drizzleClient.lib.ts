import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg, { type PoolConfig, Pool } from 'pg';
import * as schema from '@/models/index';
import { dbConfig } from '@/config/db.config';
import logger from '@/utils/logger';
import { config } from '@/config/env.config';

export type Database = NodePgDatabase<typeof schema>;

class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: pg.Pool | null = null;
  private db: Database | null = null;

  private constructor() {}

  /**
   * Get the DatabaseManager singleton instance
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Get the database connection
   * @returns Database connection instance
   * @throws Error if connection initialization fails
   */
  public getConnection(): Database {
    if (!this.db) {
      this.initialize();
    }

    if (!this.db) {
      logger.error('Failed to initialize database connection');
      throw new Error('Database initialization failed');
    }

    return this.db;
  }

  /**
   * Initialize the database connection pool and Drizzle instance
   */
  private initialize(): void {
    try {
      if (this.db) return;

      if (!this.pool) {
        this.createPool();
      }

      this.db = drizzle(this.pool!, { schema });

      logger.info('PostgreSQL database connection initialized', { db: this.db });
    } catch (error) {
      logger.error('Failed to initialize database connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private createPool(): void {
    if (this.pool) return;

    const poolConfig: PoolConfig = {
      connectionString: dbConfig.connectionString,
      ssl: dbConfig.ssl,
      max: dbConfig.maxConnections,
      idleTimeoutMillis: dbConfig.idleTimeoutMillis,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    };

    this.pool = new Pool(poolConfig);

    this.pool.on('error', err => {
      logger.error('Unexpected error on PostgreSQL client', { error: err.message });
    });

    // Add development mode event listeners for better diagnostics
    if (config.isDevelopment) {
      this.setupDevelopmentLogging();
    }
  }

  /**
   * Setup additional logging for development environments
   */
  private setupDevelopmentLogging(): void {
    if (!this.pool) return;

    this.pool.on('connect', () => {
      logger.debug('PostgreSQL pool new connection');
    });

    this.pool.on('acquire', () => {
      if (!this.pool) return;
      logger.debug(
        `PostgreSQL pool connection acquired, total: ${this.pool.totalCount}, idle: ${this.pool.idleCount}`
      );
    });

    this.pool.on('remove', () => {
      logger.debug('PostgreSQL pool connection removed');
    });
  }
  /**
   * Close database connections and cleanup resources
   */
  public async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.db = null;
        this.pool = null;
        logger.info('PostgreSQL connection pool closed');
      } catch (error) {
        logger.error('Error closing PostgreSQL connection pool', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}

/**
 * Get database connection instance
 * @returns Database connection instance
 */
export const db = (): Database => {
  return DatabaseManager.getInstance().getConnection();
};

/**
 * Close database connections
 */
export async function closeDb(): Promise<void> {
  await DatabaseManager.getInstance().close();
}

export default DatabaseManager.getInstance().getConnection();
