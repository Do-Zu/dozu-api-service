import logger from '@/utils/logger';
import EventEmitter from 'events';
import Redis from 'ioredis';
import { REDIS_INSTANCES, RedisInstanceType, RedisInstanceConfig } from './redis.instances';

export class RedisManager {
  private static instance: RedisManager;
  private events: EventEmitter;
  private redisConnections: Map<RedisInstanceType, Redis | null> = new Map();
  private connectionAttempts: Map<RedisInstanceType, number> = new Map();
  private readonly retryStrategy = {
    maxRetryTime: 10 * 1000, //~10s
    retryDelay: 500, //~500ms
  };
  private readonly maxConnectionAttempts = 3;

  private constructor() {
    this.events = new EventEmitter();

    // Initialize connection attempts counter for each instance type
    Object.keys(REDIS_INSTANCES).forEach(instanceType => {
      this.connectionAttempts.set(instanceType as RedisInstanceType, 0);
    });

    // Log available Redis configurations
    logger.info('Available Redis configurations:', Object.keys(REDIS_INSTANCES));
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  public connect(instanceType: RedisInstanceType = 'DEFAULT'): Redis {
    try {
      // If already connected and ready, return the existing connection
      const existingConnection = this.redisConnections.get(instanceType);
      if (existingConnection && existingConnection.status === 'ready') return existingConnection;

      // Get connection attempts for this instance
      const attempts = this.connectionAttempts.get(instanceType) || 0;

      if (attempts >= this.maxConnectionAttempts) {
        logger.error(
          `Failed to connect to Redis (${instanceType}) after ${this.maxConnectionAttempts} attempts. Using fallback strategy.`
        );
        this.events.emit('max_retries_exceeded', instanceType);

        // Return a dummy Redis client that logs operations but doesn't crash
        return this.createFallbackClient(instanceType);
      }

      // Increment connection attempts
      this.connectionAttempts.set(instanceType, attempts + 1);

      logger.info(
        `Connecting to Redis (${instanceType}) (attempt ${attempts + 1} of ${this.maxConnectionAttempts})...`
      );

      // Get config for this instance type
      const config = REDIS_INSTANCES[instanceType];
      logger.debug(`Redis ${instanceType} config:`, {
        host: config.host,
        port: config.port,
        db: config.db,
      });

      // Create the Redis connection
      const redisConnection = this.createRedisConnection(config, instanceType);

      // Store the connection
      this.redisConnections.set(instanceType, redisConnection);

      return redisConnection;
    } catch (error) {
      logger.error(`Failed to initialize Redis connection (${instanceType}):`, error);

      const attempts = this.connectionAttempts.get(instanceType) || 0;
      if (attempts < this.maxConnectionAttempts) {
        logger.info(`Retrying Redis connection for ${instanceType}...`);
        return this.connect(instanceType);
      }

      return this.createFallbackClient(instanceType);
    }
  }

  private createRedisConnection(
    config: RedisInstanceConfig,
    instanceType: RedisInstanceType
  ): Redis {
    const redisConnection = new Redis({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password || undefined,
      db: config.db,
      enableReadyCheck: true,
      maxRetriesPerRequest: null,
      connectTimeout: 5000, //5s
      retryStrategy: times => {
        if (times * this.retryStrategy.retryDelay > this.retryStrategy.maxRetryTime) {
          // Stop retrying after maxRetryTime
          return null;
        }
        return Math.min(times * 100, 3000); // Exponential backoff with max 3s delay
      },
      reconnectOnError: error => {
        const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];
        if (targetErrors.includes(error.message)) {
          return true;
        }
        return false;
      },
    });

    this.setupListeners(redisConnection, instanceType);
    return redisConnection;
  }

  private setupListeners(redisConnection: Redis, instanceType: RedisInstanceType): void {
    if (!redisConnection) return;

    redisConnection.on('error', error => {
      logger.error(`Redis connection error (${instanceType}):`, error);
      this.events.emit('error', { instanceType, error });
    });

    redisConnection.on('ready', () => {
      logger.info(`Redis connection established (${instanceType})`);
      this.events.emit('ready', instanceType);
    });

    redisConnection.on('reconnecting', () => {
      logger.info(`Redis reconnecting (${instanceType})...`);
      this.events.emit('reconnecting', instanceType);
    });

    redisConnection.on('close', () => {
      logger.info(`Redis connection closed (${instanceType})`);
      this.events.emit('close', instanceType);
    });
  }

  // Helper methods for each Redis instance
  private getRedisClient(instanceType: RedisInstanceType = 'DEFAULT'): Redis {
    return this.connect(instanceType);
  }

  public async get(key: string, instanceType: RedisInstanceType = 'DEFAULT') {
    const data = await this.getRedisClient(instanceType).get(key);
    return data ? JSON.parse(data) : null;
  }

  public async set(
    key: string,
    value: unknown,
    ttlSeconds?: number,
    instanceType: RedisInstanceType = 'DEFAULT'
  ): Promise<'OK'> {
    const redis = this.getRedisClient(instanceType);
    const dataParse = JSON.stringify(value);
    if (ttlSeconds) {
      return redis.set(key, dataParse, 'EX', ttlSeconds);
    }
    return redis.set(key, dataParse);
  }

  public async del(keys: string[], instanceType: RedisInstanceType = 'DEFAULT'): Promise<number> {
    return this.getRedisClient(instanceType).del(...keys);
  }

  public async exists(
    keys: string[],
    instanceType: RedisInstanceType = 'DEFAULT'
  ): Promise<number> {
    return this.getRedisClient(instanceType).exists(...keys);
  }

  public async expire(
    key: string,
    seconds: number,
    instanceType: RedisInstanceType = 'DEFAULT'
  ): Promise<number> {
    return this.getRedisClient(instanceType).expire(key, seconds);
  }

  public async hget(
    key: string,
    field: string,
    instanceType: RedisInstanceType = 'DEFAULT'
  ): Promise<string | null> {
    return this.getRedisClient(instanceType).hget(key, field);
  }

  public async hset(
    key: string,
    field: string,
    value: string,
    instanceType: RedisInstanceType = 'DEFAULT'
  ): Promise<number> {
    return this.getRedisClient(instanceType).hset(key, field, value);
  }

  public async hmset(
    key: string,
    hash: Record<string, string>,
    instanceType: RedisInstanceType = 'DEFAULT'
  ): Promise<'OK'> {
    return this.getRedisClient(instanceType).hmset(key, hash);
  }

  public async hgetall(
    key: string,
    instanceType: RedisInstanceType = 'DEFAULT'
  ): Promise<Record<string, string>> {
    return this.getRedisClient(instanceType).hgetall(key);
  }

  public async flushdb(instanceType: RedisInstanceType = 'DEFAULT'): Promise<'OK'> {
    return this.getRedisClient(instanceType).flushdb();
  }

  public async disconnect(instanceType?: RedisInstanceType): Promise<void> {
    if (instanceType) {
      // Disconnect specific instance
      const redis = this.redisConnections.get(instanceType);
      if (redis) {
        await redis.quit();
        this.redisConnections.set(instanceType, null);
      }
    } else {
      // Disconnect all instances
      const disconnectPromises: Promise<void>[] = [];

      this.redisConnections.forEach((redis, type) => {
        if (redis) {
          disconnectPromises.push(
            redis.quit().then(() => {
              this.redisConnections.set(type, null);
            })
          );
        }
      });

      await Promise.all(disconnectPromises);
    }
  }

  private createFallbackClient(instanceType: RedisInstanceType): Redis {
    logger.warn(
      `Using Redis fallback mode for ${instanceType} - operations will be logged but not executed`
    );

    // Create a proxy object with the same API as Redis
    const fallbackClient = {
      status: 'fallback',

      get: async (key: string) => {
        logger.debug(`[Redis Fallback ${instanceType}] GET ${key}`);
        return null;
      },

      set: async (key: string, value: string) => {
        logger.debug(`[Redis Fallback ${instanceType}] SET ${key} ${value?.substring(0, 20)}...`);
        return 'OK';
      },

      del: async (...keys: string[]) => {
        logger.debug(`[Redis Fallback ${instanceType}] DEL ${keys.join(', ')}`);
        return 0;
      },

      exists: async (...keys: string[]) => {
        logger.debug(`[Redis Fallback ${instanceType}] EXISTS ${keys.join(', ')}`);
        return 0;
      },

      expire: async (key: string, seconds: number) => {
        logger.debug(`[Redis Fallback ${instanceType}] EXPIRE ${key} ${seconds}`);
        return 0;
      },

      hget: async (key: string, field: string) => {
        logger.debug(`[Redis Fallback ${instanceType}] HGET ${key} ${field}`);
        return null;
      },

      hset: async (key: string, field: string, value: string) => {
        logger.debug(
          `[Redis Fallback ${instanceType}] HSET ${key} ${field} ${value?.substring(0, 20)}...`
        );
        return 0;
      },
      hmset: async (key: string, hash: Record<string, string>) => {
        logger.debug(
          `[Redis Fallback ${instanceType}] HMSET ${key} ${Object.keys(hash).length} fields`
        );
        return 'OK';
      },

      hgetall: async (key: string) => {
        logger.debug(`[Redis Fallback ${instanceType}] HGETALL ${key}`);
        return {};
      },

      flushdb: async () => {
        logger.debug(`[Redis Fallback ${instanceType}] FLUSHDB`);
        return 'OK';
      },

      // Handle events
      on: (event: string) => {
        logger.debug(`[Redis Fallback ${instanceType}] Registered event handler for ${event}`);
        return fallbackClient;
      },

      quit: async () => {
        logger.debug(`[Redis Fallback ${instanceType}] QUIT`);
        return 'OK';
      },
    };

    // Return the proxy object cast as Redis
    return fallbackClient as unknown as Redis;
  }
  public onEvent(event: string, callback: (...args: unknown[]) => void): void {
    this.events.on(event, callback);
  }
}

export const redisManager = RedisManager.getInstance();

// Export convenience functions to access different Redis instances
export const getRedis = (instanceType: RedisInstanceType = 'DEFAULT'): Redis => {
  return redisManager.connect(instanceType);
};

// Default Redis instance (for backward compatibility)
export const redis = getRedis('DEFAULT');

// Specific Redis instances
export const redisPubSub = getRedis('PUBSUB');
export const redisRecommendation = getRedis('RECOMMENDATION');
