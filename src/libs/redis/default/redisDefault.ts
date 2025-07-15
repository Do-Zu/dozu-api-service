import { AbstractRedisManager } from '../base/redis.abstract';
import { REDIS_INSTANCES } from '../redis.instances';

export class RedisManager extends AbstractRedisManager {
    private static instance: RedisManager;

    protected constructor() {
        const config = REDIS_INSTANCES.DEFAULT;
        super(config.host, config.port, config.password, config.db, config.username);
    }

    public static getInstance(): RedisManager {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }

    public onEvent(event: string, callback: (...args: any[]) => void): void {
        this.events.on(event, callback);
    }
}

export const redisInstance = RedisManager.getInstance();

export const redis = redisInstance.connect();
