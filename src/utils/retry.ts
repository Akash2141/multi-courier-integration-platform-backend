import { logger } from '../logger';

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: boolean;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    initialDelayMs,
    maxDelayMs = 30000,
    backoffFactor = 2,
    jitter = true,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let attempt = 0;
  let currentDelay = initialDelayMs;

  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      let sleepDuration = Math.min(currentDelay, maxDelayMs);
      if (jitter) {
        // Add random jitter between 0.8 and 1.2 * delay
        const jitterMultiplier = 0.8 + Math.random() * 0.4;
        sleepDuration = Math.round(sleepDuration * jitterMultiplier);
      }

      if (onRetry) {
        onRetry(error, attempt, sleepDuration);
      } else {
        logger.warn(`Operation failed on attempt ${attempt}/${maxAttempts}. Retrying in ${sleepDuration}ms...`, {
          attempt,
          maxAttempts,
          sleepDuration,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }

      await delay(sleepDuration);
      currentDelay *= backoffFactor;
    }
  }
}
