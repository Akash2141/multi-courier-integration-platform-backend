import { ICacheService } from './cache.interface';
import { MemoryCacheService } from './memory.cache';
import { RedisCacheService } from './redis.cache';
import { config } from '../config';
import { logger } from '../logger';

export * from './cache.interface';
export * from './memory.cache';
export * from './redis.cache';

class CacheManager {
  private static instance: ICacheService;

  public static getInstance(): ICacheService {
    if (!CacheManager.instance) {
      if (config.redis.enabled && config.redis.url) {
        logger.info(`Initializing Distributed Redis Cache with URL: ${config.redis.url.replace(/:[^:@]+@/, ':***@')}`);
        CacheManager.instance = new RedisCacheService(config.redis.url);
      } else {
        logger.info('Redis URL not configured. Operating with in-memory cache.');
        CacheManager.instance = new MemoryCacheService();
      }
    }
    return CacheManager.instance;
  }

  /**
   * Overrides cache instance (useful for unit testing).
   */
  public static setInstance(service: ICacheService): void {
    CacheManager.instance = service;
  }
}

export const cacheService: ICacheService = CacheManager.getInstance();
