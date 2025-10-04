import logger from '@/utils/logger';
import EventEmitter from 'events';
import Redis from 'ioredis';
import { IRedisManager } from './redis.interface';

export abstract class AbstractRedisManager implements IRedisManager {
    protected events: EventEmitter;
    protected redis: Redis | null = null;
    protected readonly retryStrategy = {
        maxRetryTime: 10 * 1000, //~10s
        retryDelay: 500, //~500ms
    };

    protected connectionAttempts = 0;
    protected readonly maxConnectionAttempts = 3;
    private host: string = 'localhost';
    private port: number = 6379;
    private password: string = '';
    private db: number = 0;
    private username: string = 'default';

    constructor(host: string, port: number, password: string, db: number, username: string) {
        this.host = host;
        this.port = port;
        this.password = password;
        this.db = db;
        this.username = username;
        this.events = new EventEmitter();
    }

    public connect(): Redis {
        try {
            if (this.redis && this.redis.status === 'ready') return this.redis;

            if (this.connectionAttempts >= this.maxConnectionAttempts) {
                logger.error(
                    `Failed to connect to Redis after ${this.maxConnectionAttempts} attempts. Using fallback strategy.`
                );
                this.events.emit('max_retries_exceeded');

                // Return a dummy Redis client that logs operations but doesn't crash
                return this.createFallbackClient();
            }

            this.connectionAttempts++;

            console.info(
                `Connecting to Redis (attempt ${this.connectionAttempts} of ${this.maxConnectionAttempts})...`
            );

            this.redis = new Redis({
                host: this.host,
                port: this.port,
                username: this.username,
                password: this.password || undefined,
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
            this.setupListeners();
            return this.redis;
        } catch (error) {
            logger.error('Failed to initialize Redis connection:', error);
            if (this.connectionAttempts < this.maxConnectionAttempts) {
                console.info('Retrying Redis connection...');
                return this.connect();
            }
            return this.createFallbackClient();
        }
    }

    protected setupListeners(): void {
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

    public async setnx(key: string, value: unknown): Promise<number> {
        const redis = this.connect();
        const dataParse = JSON.stringify(value);

        return redis.setnx(key, dataParse);
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

    public async incr(key: string): Promise<number> {
        return this.connect().incr(key);
    }

    public async disconnect(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
            this.redis = null;
        }
    }

    private createFallbackClient(): Redis {
        logger.warn('Using Redis fallback mode - operations will be logged but not executed');

        // Create a proxy object with the same API as Redis
        const fallbackClient = {
            status: 'fallback',

            get: async (key: string) => {
                console.debug(`[Redis Fallback] GET ${key}`);
                return null;
            },

            set: async (key: string, value: string) => {
                console.debug(`[Redis Fallback] SET ${key} ${value?.substring(0, 20)}...`);
                return 'OK';
            },

            // Add other required Redis methods here
            del: async (...keys: string[]) => {
                console.debug(`[Redis Fallback] DEL ${keys.join(', ')}`);
                return 0;
            },

            // Handle events
            on: (event: string) => {
                console.debug(`[Redis Fallback] Registered event handler for ${event}`);
                return fallbackClient;
            },

            // Add other required methods
            quit: async () => {
                console.debug('[Redis Fallback] QUIT');
                return 'OK';
            },
        };

        // Return the proxy object cast as Redis
        return fallbackClient as unknown as Redis;
    }

    public onEvent(event: string, callback: (...args: any[]) => void): void {
        this.events.on(event, callback);
    }
}
