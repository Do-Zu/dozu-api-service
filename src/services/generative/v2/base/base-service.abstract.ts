import {
  IGenerativeService,
  GenerationOptions,
} from '@/services/generative/v2/base/service.interface';
import { x86 } from 'murmurhash3js';
import { createHash } from 'crypto';
import NodeCache from 'node-cache';

/**
 * Abstract base class for all generative services
 * Implements caching and other common functionality
 */
export abstract class BaseGenerativeService implements IGenerativeService {
  // In-memory cache with 1 hour TTL by default
  protected cache: NodeCache;
  protected readonly modelName: string;

  constructor(modelName: string, cacheTTL: number = 3600) {
    this.modelName = modelName;
    this.cache = new NodeCache({ stdTTL: cacheTTL });
  }

  /**
   * Get the model name used by this service
   */
  public getModelName(): string {
    return this.modelName;
  }

  /**
   * Check if service is available (can be overridden)
   */
  public async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Generate a cache key based on parameters
   */
  protected generateCacheKey(prompt: string, options?: GenerationOptions): string {
    // For short prompts,
    if (prompt.length < 1000) {
      const payload = `${prompt}${JSON.stringify(options)}`;
      const hash = x86.hash32(payload);
      return hash.toString();
    }
    const DEFAULT_FROM_SUBSTRING = 200;
    const DEFAULT_TO_SUBSTRING = 400;
    // For longer prompts, use MD5 hash
    const promptPrefix = prompt.substring(DEFAULT_FROM_SUBSTRING, DEFAULT_TO_SUBSTRING);
    const fullHash = createHash('md5')
      .update(`${promptPrefix}${JSON.stringify(options || {})}`)
      .digest('hex')
      .substring(0, 8);

    return fullHash;
  }

  /**
   * Try to get results from cache
   * @returns cached result or null if not found
   */
  protected getFromCache<T>(key: string): T | null {
    return (this.cache.get(key) as T) || null;
  }

  /**
   * Store results in cache
   */
  protected storeInCache<T>(key: string, data: T): boolean {
    return this.cache.set(key, data);
  }
}
