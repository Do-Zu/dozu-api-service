// Redis instance types
export type RedisInstanceConfig = {
  host: string;
  port: number;
  password: string;
  db: number;
  username: string;
};

export type RedisInstanceType = 'DEFAULT' | 'PUBSUB' | 'RECOMMENDATION';

export const REDIS_INSTANCES: Record<RedisInstanceType, RedisInstanceConfig> = {
  DEFAULT: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0'),
    username: process.env.REDIS_USERNAME || 'default',
  },
  PUBSUB: {
    host: process.env.REDIS_PUBSUB_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PUBSUB_PORT || '6379'),
    password: process.env.REDIS_PUBSUB_PASSWORD || '',
    db: parseInt(process.env.REDIS_PUBSUB_DB || '0'),
    username: process.env.REDIS_PUBSUB_USERNAME || 'default',
  },
  RECOMMENDATION: {
    host: process.env.REDIS_RECOMMENDATION_HOST || process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_RECOMMENDATION_PORT || process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_RECOMMENDATION_PASSWORD || process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_RECOMMENDATION_DB || process.env.REDIS_DB || '0'),
    username: process.env.REDIS_RECOMMENDATION_USERNAME || process.env.REDIS_USERNAME || 'default',
  },
};
