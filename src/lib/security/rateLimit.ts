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
let lastSweep = 0;

function sweep(now: number): void {
  // Bound work too: an attacker must not trigger a full scan on every new key.
  if (now >= lastSweep && now - lastSweep < 1_000) return;
  lastSweep = now;
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
  if (!opts.key || opts.key.length > 512 || !Number.isSafeInteger(opts.limit)
    || opts.limit <= 0 || !Number.isSafeInteger(opts.windowMs) || opts.windowMs <= 0
    || !Number.isSafeInteger(now + opts.windowMs)) {
    return { ok: false, remaining: 0, resetAt: now + 1_000 };
  }
  sweep(now);

  const existing = buckets.get(opts.key);
  if (!existing || existing.resetAt <= now) {
    // Do not evict active counters: that would reset an attacker's allowance.
    if (!existing && buckets.size >= MAX_BUCKETS) {
      return { ok: false, remaining: 0, resetAt: now + 1_000 };
    }
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
