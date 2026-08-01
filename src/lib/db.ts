import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
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
