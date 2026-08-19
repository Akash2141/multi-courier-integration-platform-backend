import { MemoryCacheService } from '../../src/cache/memory.cache';

describe('Cache Service Unit Tests', () => {
  let memoryCache: MemoryCacheService;

  beforeEach(() => {
    memoryCache = new MemoryCacheService();
  });

  afterEach(() => {
    memoryCache.clear();
  });

  it('should store and retrieve value from cache', async () => {
    await memoryCache.set('test:key', 'token_value_123', 60);
    const value = await memoryCache.get('test:key');
    expect(value).toBe('token_value_123');
  });

  it('should return null for non-existent keys', async () => {
    const value = await memoryCache.get('non:existent:key');
    expect(value).toBeNull();
  });

  it('should delete keys from cache', async () => {
    await memoryCache.set('test:del', 'to_be_deleted', 60);
    await memoryCache.del('test:del');
    const value = await memoryCache.get('test:del');
    expect(value).toBeNull();
  });

  it('should expire keys according to TTL', async () => {
    // 0 TTL or negative TTL
    await memoryCache.set('test:expire', 'expired_val', -1);
    const value = await memoryCache.get('test:expire');
    expect(value).toBeNull();
  });

  it('should manage locks properly', async () => {
    const acquired1 = await memoryCache.acquireLock('auth:urbanebolt', 10);
    expect(acquired1).toBe(true);

    const acquired2 = await memoryCache.acquireLock('auth:urbanebolt', 10);
    expect(acquired2).toBe(false);

    await memoryCache.releaseLock('auth:urbanebolt');

    const acquired3 = await memoryCache.acquireLock('auth:urbanebolt', 10);
    expect(acquired3).toBe(true);
  });
});
