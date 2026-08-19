export interface ICacheService {
  /**
   * Retrieves a cached value by key.
   */
  get(key: string): Promise<string | null>;

  /**
   * Sets a key-value pair with optional TTL in seconds.
   */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;

  /**
   * Deletes a cached key.
   */
  del(key: string): Promise<void>;

  /**
   * Acquires a distributed lock to prevent auth stampedes across multiple pods.
   */
  acquireLock(lockKey: string, ttlSeconds?: number): Promise<boolean>;

  /**
   * Releases a previously acquired distributed lock.
   */
  releaseLock(lockKey: string): Promise<void>;

  /**
   * Returns cache provider name (e.g. 'redis' or 'memory').
   */
  getProviderName(): string;
}
