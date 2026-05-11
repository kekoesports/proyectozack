/**
 * Rate limit in-memory por proceso. Suficiente para defensa básica contra abuso
 * de endpoints públicos (trackClick) sin requerir Redis. En multi-instancia
 * cada réplica tendrá su propio contador — aceptable para este uso (no es un
 * límite contractual, solo anti-spam).
 *
 * Para límites más estrictos o cross-instance, sustituir por @upstash/ratelimit
 * o equivalente con Redis.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000; // cap para evitar memory leak en abuso

function sweep(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitOpts = {
  /** Identificador del bucket: ej. `trackClick:${ip}` */
  readonly key: string;
  /** Tope de hits permitidos en la ventana */
  readonly limit: number;
  /** Ventana en milisegundos */
  readonly windowMs: number;
};

export type RateLimitResult = {
  readonly ok: boolean;
  /** Hits restantes en la ventana (≥ 0). */
  readonly remaining: number;
  /** Epoch ms en que se resetea el bucket. */
  readonly resetAt: number;
};

export function checkRateLimit(opts: RateLimitOpts): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(opts.key);
  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(opts.key, bucket);
    return { ok: true, remaining: opts.limit - 1, resetAt: bucket.resetAt };
  }

  if (existing.count >= opts.limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: opts.limit - existing.count, resetAt: existing.resetAt };
}
