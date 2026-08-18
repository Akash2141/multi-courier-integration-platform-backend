/**
 * Executes a list of async task generators with a maximum concurrency limit.
 * Preserves the original index order of the results.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const effectiveLimit = Math.max(1, Math.min(limit, items.length));

  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index];
      results[index] = await worker(item, index);
    }
  };

  const pool: Promise<void>[] = [];
  for (let i = 0; i < effectiveLimit; i++) {
    pool.push(runWorker());
  }

  await Promise.all(pool);
  return results;
}
