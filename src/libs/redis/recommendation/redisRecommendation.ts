import { AbstractRedisManager } from '../base/redis.abstract';
import { REDIS_INSTANCES } from '../redis.instances';

export class RedisRecommendationManager extends AbstractRedisManager {
  private static instance: RedisRecommendationManager;

  protected constructor() {
    const config = REDIS_INSTANCES.RECOMMENDATION;
    super(config.host, config.port, config.password, config.db, config.username);
  }

  public static getInstance(): RedisRecommendationManager {
    if (!RedisRecommendationManager.instance) {
      RedisRecommendationManager.instance = new RedisRecommendationManager();
    }
    return RedisRecommendationManager.instance;
  }

  public onEvent(event: string, callback: (...args: any[]) => void): void {
    this.events.on(event, callback);
  }
}

export const redisInstance = RedisRecommendationManager.getInstance();

export const redis = redisInstance.connect();
