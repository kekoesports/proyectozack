import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as drizzleTransactional } from 'drizzle-orm/neon-serverless';
import { env } from './env';
import * as schema from '@/db/schema';

if (env.NEON_HTTP_FETCH_ENDPOINT) {
  neonConfig.fetchEndpoint = env.NEON_HTTP_FETCH_ENDPOINT;
}

const sql = neon(env.DATABASE_URL);
const serializableSql = neon(env.DATABASE_URL, { isolationLevel: 'Serializable' });

export const db = drizzle(sql, { schema });

/**
 * Operaciones económicas ejecutadas mediante `batch()` usan aislamiento
 * SERIALIZABLE. El cliente HTTP no ofrece transacciones interactivas, pero
 * sí transacciones batch no interactivas con nivel de aislamiento explícito.
 */
export const serializableDb = drizzle(serializableSql, { schema });

/**
 * Interactive transactions require the WebSocket driver. The neon-http
 * adapter deliberately does not implement db.transaction().
 */
function createTransactionalDatabase() {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    // Serverless invocations must be allowed to finish once every checked-out
    // client is idle; the pool remains reusable while the process lives.
    allowExitOnIdle: true,
  });
  return drizzleTransactional(pool, { schema });
}

let transactionalDatabase: ReturnType<typeof createTransactionalDatabase> | undefined;

/** Lazily create the WebSocket pool only when an interactive tx is requested. */
export function getTransactionalDb(): ReturnType<typeof createTransactionalDatabase> {
  transactionalDatabase ??= createTransactionalDatabase();
  return transactionalDatabase;
}
