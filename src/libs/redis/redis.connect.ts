import logger from '@/utils/logger';
import EventEmitter from 'events';
import Redis from 'ioredis';

export class RedisManager {
  private static instance: RedisManager;
  private events: EventEmitter;
  private redis: Redis | null = null;
  private readonly retryStrategy = {
    maxRetryTime: 30 * 1000, //~30s
    retryDelay: 100, //~100ms
  };

  private constructor(
    private host: string = 'redis-16102.c292.ap-southeast-1-1.ec2.redns.redis-cloud.com',
    private port: number = parseInt(process.env.REDIS_PORT || '6379'),
    private password: string = process.env.REDIS_PASSWORD || '',
    private db: number = parseInt(process.env.REDIS_DB || '0'),
    private username: string = process.env.REDIS_USERNAME || 'default'
  ) {
    console.log({
      host: this.host,
      port: this.port,
      password: this.password,
      username: this.username,
    });

    this.events = new EventEmitter();
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  public connect(): Redis {
    if (this.redis && this.redis.status === 'ready') return this.redis;

    this.redis = new Redis({
      host: this.host,
      port: this.port,
      username: this.username,
      password: this.password || undefined,
      retryStrategy: times => {
        if (times * this.retryStrategy.retryDelay > this.retryStrategy.maxRetryTime) {
          // Stop retrying after maxRetryTime
          return null;
        }
        return Math.min(times * 100, 3000); // Exponential backoff with max 3s delay
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: null,
      connectTimeout: 10000, //10s
    });
    this.setupListeners();
    return this.redis;
  }

  private setupListeners(): void {
    if (!this.redis) return;
    this.redis.on('error', error => {
      console.error('Redis connection error:', error);
      logger.error('Redis connection error:', error);
      this.events.emit('error', error);
    });

    this.redis.on('ready', () => {
      logger.info('Redis connection established');
      this.events.emit('ready');
    });

    this.redis.on('reconnecting', () => {
      console.log('Redis reconnecting...');
      this.events.emit('reconnecting');
    });

    this.redis.on('close', () => {
      console.log('Redis connection closed');
      this.events.emit('close');
    });
  }

  public async get(key: string) {
    const data = await this.connect().get(key);
    return data ? JSON.parse(data) : null;
  }

  public async set(key: string, value: unknown, ttlSeconds?: number): Promise<'OK'> {
    const redis = this.connect();
    const dataParse = JSON.stringify(value);
    if (ttlSeconds) {
      return redis.set(key, dataParse, 'EX', ttlSeconds);
    }
    return redis.set(key, dataParse);
  }

  public async del(...keys: string[]): Promise<number> {
    return this.connect().del(...keys);
  }

  public async exists(...keys: string[]): Promise<number> {
    return this.connect().exists(...keys);
  }

  public async expire(key: string, seconds: number): Promise<number> {
    return this.connect().expire(key, seconds);
  }

  public async hget(key: string, field: string): Promise<string | null> {
    return this.connect().hget(key, field);
  }

  public async hset(key: string, field: string, value: string): Promise<number> {
    return this.connect().hset(key, field, value);
  }

  public async hmset(key: string, hash: Record<string, string>): Promise<'OK'> {
    return this.connect().hmset(key, hash);
  }

  public async hgetall(key: string): Promise<Record<string, string>> {
    return this.connect().hgetall(key);
  }

  public async flushdb(): Promise<'OK'> {
    return this.connect().flushdb();
  }

  public async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }

  public onEvent(event: string, callback: (...args: any[]) => void): void {
    this.events.on(event, callback);
  }
}

export const redisInstance = RedisManager.getInstance();

export const redis = redisInstance.connect();
