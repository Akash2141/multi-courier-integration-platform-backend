import Redis, { Redis as RedisClient } from 'ioredis';
import { ICacheService } from './cache.interface';
import { config } from '../config';
import { logger } from '../logger';

export class RedisCacheService implements ICacheService {
  private client: RedisClient | null = null;
  private readonly keyPrefix: string;
  private isConnected: boolean = false;

  constructor(redisUrl?: string) {
    this.keyPrefix = config.redis.keyPrefix;
    const url = redisUrl || config.redis.url;

    if (!url) {
      logger.warn('Redis URL is not provided. RedisCacheService will operate in disconnected mode.');
      return;
    }

    try {
      this.client = new Redis(url, {
        keyPrefix: this.keyPrefix,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 200, 2000);
          logger.warn(`Redis connection retry attempt ${times}, delaying ${delay}ms...`);
          return delay;
        },
        enableReadyCheck: true,
        lazyConnect: false,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Connected to Redis cluster successfully.');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        logger.info('Redis client is ready for distributed caching.');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        logger.error('Redis connection error:', { error: err.message });
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed.');
      });
    } catch (err: unknown) {
      logger.error('Failed to initialize Redis client:', { error: err instanceof Error ? err.message : err });
    }
  }

  public getProviderName(): string {
    return 'redis';
  }

  public async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      logger.warn(`Redis GET failed for key '${key}':`, { error: err instanceof Error ? err.message : err });
      return null;
    }
  }

  public async set(key: string, value: string, ttlSeconds: number = 43200): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      if (ttlSeconds > 0) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      logger.warn(`Redis SET failed for key '${key}':`, { error: err instanceof Error ? err.message : err });
    }
  }

  public async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (err) {
      logger.warn(`Redis DEL failed for key '${key}':`, { error: err instanceof Error ? err.message : err });
    }
  }

  /**
   * Acquires a distributed lock using Redis SETNX (atomic with expiration).
   */
  public async acquireLock(lockKey: string, ttlSeconds: number = 10): Promise<boolean> {
    if (!this.client || !this.isConnected) return true; // Fail-open if Redis unavailable
    try {
      const result = await this.client.set(`lock:${lockKey}`, 'LOCKED', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (err) {
      logger.warn(`Redis lock acquisition failed for '${lockKey}':`, { error: err instanceof Error ? err.message : err });
      return true; // Fallback to allowing process execution
    }
  }

  /**
   * Releases a distributed lock.
   */
  public async releaseLock(lockKey: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(`lock:${lockKey}`);
    } catch (err) {
      logger.warn(`Redis lock release failed for '${lockKey}':`, { error: err instanceof Error ? err.message : err });
    }
  }

  /**
   * Closes the Redis connection gracefully on application shutdown.
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}
