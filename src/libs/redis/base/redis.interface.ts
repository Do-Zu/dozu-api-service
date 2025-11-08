import Redis from 'ioredis';

/**
 * Interface defining the contract for Redis managers
 */
export interface IRedisManager {
  /**
   * Connect to Redis server
   * @returns Redis client instance
   */
  connect(): Redis;

  /**
   * Get a value by key
   * @param key Redis key
   * @returns Parsed value or null if not found
   */
  get(key: string): Promise<object | string | number | Array<unknown> | null>;

  /**
   * Set a value with optional expiration
   * @param key Redis key
   * @param value Value to store
   * @param ttlSeconds Optional time-to-live in seconds
   * @returns Redis OK response
   */
  set(
    key: string,
    value: object | string | number | Array<unknown>,
    ttlSeconds?: number
  ): Promise<'OK'>;

  /**
   * Delete one or more keys
   * @param keys Keys to delete
   * @returns Number of keys deleted
   */
  del(...keys: string[]): Promise<number>;

  /**
   * Check if one or more keys exist
   * @param keys Keys to check
   * @returns Number of existing keys
   */
  exists(...keys: string[]): Promise<number>;

  /**
   * Set expiration time on a key
   * @param key Redis key
   * @param seconds Expiration in seconds
   * @returns 1 if successful, 0 if key doesn't exist
   */
  expire(key: string, seconds: number): Promise<number>;

  /**
   * Get a hash field
   * @param key Redis key
   * @param field Hash field
   * @returns Value or null if not found
   */
  hget(key: string, field: string): Promise<string | null>;

  /**
   * Set a hash field
   * @param key Redis key
   * @param field Hash field
   * @param value Value to store
   * @returns 1 if field is new, 0 if field was updated
   */
  hset(key: string, field: string, value: string): Promise<number>;

  /**
   * Set multiple hash fields
   * @param key Redis key
   * @param hash Object with field-value pairs
   * @returns Redis OK response
   */
  hmset(key: string, hash: Record<string, string>): Promise<'OK'>;

  /**
   * Get all fields and values in a hash
   * @param key Redis key
   * @returns Object with all field-value pairs
   */
  hgetall(key: string): Promise<Record<string, string>>;

  /**
   * Delete all keys in the current database
   * @returns Redis OK response
   */
  flushdb(): Promise<'OK'>;

  /**
   * Add one or more members to a set
   * @param key Redis key
   * @param members Members to add to the set
   * @returns Number of members added (excluding duplicates)
   */
  sadd(key: string, ...members: string[]): Promise<number>;

  /**
   * Get all members of a set
   * @param key Redis key
   * @returns Array of all members in the set
   */
  smembers(key: string): Promise<string[]>;

  /**
   * Remove one or more members from a set
   * @param key Redis key
   * @param members Members to remove from the set
   * @returns Number of members removed
   */
  srem(key: string, ...members: string[]): Promise<number>;

  /**
   * Check if a value is a member of a set
   * @param key Redis key
   * @param member Member to check
   * @returns 1 if member exists, 0 if not
   */
  sismember(key: string, member: string): Promise<number>;

  /**
   * Disconnect from Redis server
   */
  disconnect(): Promise<void>;

  /**
   * Register an event listener
   * @param event Event name
   * @param callback Function to call when event is triggered
   */
  onEvent(event: string, callback: (...args: unknown[]) => void): void;
}
