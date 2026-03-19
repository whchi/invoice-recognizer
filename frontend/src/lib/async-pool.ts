/**
 * Processes items in batches with a max concurrency limit.
 * Results are returned in the same order as the input items.
 */
export async function asyncPool<T, R>(
  items: T[],
  concurrency: number,
  iteratorFn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing = new Set<Promise<void>>();

  for (let i = 0; i < items.length; i++) {
    const index = i;
    const item = items[i];
    const p = iteratorFn(item).then(result => {
      results[index] = result;
    });
    const wrapped = p.then(() => {
      executing.delete(wrapped);
    });
    executing.add(wrapped);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
