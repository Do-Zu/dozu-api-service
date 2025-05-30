import { AbstractRedisManager } from '../base/redis.abstract';

export class RedisPubSubManager extends AbstractRedisManager {
  private static instance: RedisPubSubManager;

  private constructor(
    host: string = process.env.REDIS_PUBSUB_HOST || 'localhost',
    port: number = parseInt(process.env.REDIS_PUBSUB_PORT || '6379'),
    password: string = process.env.REDIS_PUBSUB_PASSWORD || '',
    db: number = parseInt(process.env.REDIS_PUBSUB_DB || '0'),
    username: string = process.env.REDIS_PUBSUB_USERNAME || 'default'
  ) {
    super(host, port, password, db, username);
  }

  public static getInstance(): RedisPubSubManager {
    if (!RedisPubSubManager.instance) {
      RedisPubSubManager.instance = new RedisPubSubManager();
    }
    return RedisPubSubManager.instance;
  }

  public onEvent(event: string, callback: (...args: any[]) => void): void {
    this.events.on(event, callback);
  }
}

export const redisInstance = RedisPubSubManager.getInstance();

export const redis = redisInstance.connect();
