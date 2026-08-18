import { retryWithBackoff } from '../../src/utils/retry';

describe('Retry Utility Unit Tests', () => {
  it('should return result on first attempt if successful', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(fn, {
      maxAttempts: 3,
      initialDelayMs: 10,
      jitter: false,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed if subsequent attempt succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Transient network error'))
      .mockResolvedValueOnce('recovered');

    const result = await retryWithBackoff(fn, {
      maxAttempts: 3,
      initialDelayMs: 10,
      jitter: false,
    });

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw error after exhausting maximum attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Persistent courier failure'));

    await expect(
      retryWithBackoff(fn, {
        maxAttempts: 3,
        initialDelayMs: 10,
        jitter: false,
      })
    ).rejects.toThrow('Persistent courier failure');

    expect(fn).toHaveBeenCalledTimes(3);
  });
});
