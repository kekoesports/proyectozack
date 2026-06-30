/**
 * Limitador de concurrencia simple (inline, sin dependencias).
 *
 * Devuelve una función `runWithLimit(fn)` que procesa la cola con un máximo
 * de `n` promesas simultáneas. Útil para evitar avalanchas contra APIs con
 * rate limit (ej. Google Sheets v4: 100 reads / 100s / proyecto).
 *
 * Uso típico:
 *   const limit = createLimit(4);
 *   const results = await Promise.allSettled(
 *     items.map((it) => limit(() => syncOne(it.id))),
 *   );
 *
 * Cada call a `limit(fn)` devuelve una promesa que se resuelve cuando `fn`
 * termina. La cola interna garantiza que como máximo `n` están corriendo.
 */
export function createLimit(maxConcurrency: number) {
  if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
    throw new Error('createLimit: maxConcurrency debe ser entero >= 1');
  }
  let activeCount = 0;
  const queue: Array<() => void> = [];

  const next = (): void => {
    if (activeCount >= maxConcurrency) return;
    const task = queue.shift();
    if (!task) return;
    activeCount++;
    task();
  };

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = (): void => {
        fn().then(
          (v) => { resolve(v); activeCount--; next(); },
          (e: unknown) => { reject(e instanceof Error ? e : new Error(String(e))); activeCount--; next(); },
        );
      };
      queue.push(run);
      next();
    });
  };
}
