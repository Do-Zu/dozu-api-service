import { AbstractRedisManager } from '../base/redis.abstract';
import { REDIS_INSTANCES } from '../redis.instances';

export class RedisWordFrequencyManager extends AbstractRedisManager {
  private static instance: RedisWordFrequencyManager;
  private readonly WORD_FREQUENCY_HASH = 'global:word:frequency';
  private readonly DOCUMENT_COUNT_KEY = 'global:document:count';

  protected constructor() {
    const config = REDIS_INSTANCES.RECOMMENDATION;
    super(config.host, config.port, config.password, config.db, config.username);
  }

  public static getInstance(): RedisWordFrequencyManager {
    if (!RedisWordFrequencyManager.instance) {
      RedisWordFrequencyManager.instance = new RedisWordFrequencyManager();
    }
    return RedisWordFrequencyManager.instance;
  }

  /**
   * Increment frequency counts for a list of terms
   */
  public async incrementTermFrequencies(terms: string[]): Promise<void> {
    const client = this.connect();
    const pipeline = client.pipeline();

    // Use Set to get unique terms only
    const uniqueTerms = [...new Set(terms)];

    // Increment each term's frequency
    for (const term of uniqueTerms) {
      pipeline.hincrby(this.WORD_FREQUENCY_HASH, term, 1);
    }

    // Increment document count
    pipeline.incr(this.DOCUMENT_COUNT_KEY);

    await pipeline.exec();
  }

  /**
   * Get document frequency for specific terms
   */
  public async getTermFrequencies(terms: string[]): Promise<Record<string, number>> {
    if (terms.length === 0) {
      return {};
    }

    const client = this.connect();
    const values = await client.hmget(this.WORD_FREQUENCY_HASH, ...terms);

    const result: Record<string, number> = {};
    terms.forEach((term, index) => {
      result[term] = values[index] ? parseInt(values[index], 10) : 0;
    });

    return result;
  }

  /**
   * Get the total number of documents processed
   */
  public async getDocumentCount(): Promise<number> {
    const client = this.connect();
    const count = await client.get(this.DOCUMENT_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  }
}

export const wordFrequencyRedis = RedisWordFrequencyManager.getInstance();
