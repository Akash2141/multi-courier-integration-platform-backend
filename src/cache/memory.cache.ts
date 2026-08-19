import { ICacheService } from './cache.interface';
import { logger } from '../logger';

interface CacheItem {
  value: string;
  expiresAt: number;
}

export class MemoryCacheService implements ICacheService {
  private readonly storage: Map<string, CacheItem> = new Map();
  private readonly locks: Map<string, number> = new Map();

  public getProviderName(): string {
    return 'memory';
  }

  public async get(key: string): Promise<string | null> {
    const item = this.storage.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.storage.delete(key);
      return null;
    }

    return item.value;
  }

  public async set(key: string, value: string, ttlSeconds: number = 43200): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.storage.set(key, { value, expiresAt });
  }

  public async del(key: string): Promise<void> {
    this.storage.delete(key);
  }

  public async acquireLock(lockKey: string, ttlSeconds: number = 10): Promise<boolean> {
    const now = Date.now();
    const existingLockExpiry = this.locks.get(lockKey);

    if (existingLockExpiry && now < existingLockExpiry) {
      return false; // Lock is currently held
    }

    this.locks.set(lockKey, now + ttlSeconds * 1000);
    return true;
  }

  public async releaseLock(lockKey: string): Promise<void> {
    this.locks.delete(lockKey);
  }

  /**
   * Helper to clear entire cache (for unit testing).
   */
  public clear(): void {
    this.storage.clear();
    this.locks.clear();
  }
}
