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

// El adaptador neon-http lanza "No transactions support in neon-http driver"
// en cuanto se invoca db.transaction(). Las escrituras que necesitan
// SELECT ... FOR UPDATE + lógica intermedia (facturación, conciliación
// bancaria) usan este pool WebSocket bajo demanda.
function createTransactionalDatabase(): ReturnType<typeof drizzleTransactional<typeof schema>> {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    allowExitOnIdle: true,
  });
  return drizzleTransactional(pool, { schema });
}

let transactionalDatabase: ReturnType<typeof createTransactionalDatabase> | undefined;

export function getTransactionalDb(): ReturnType<typeof createTransactionalDatabase> {
  transactionalDatabase ??= createTransactionalDatabase();
  return transactionalDatabase;
}
