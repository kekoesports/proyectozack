import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { SQL } from 'drizzle-orm';
import { env } from './env';
import { normalizePostgresSslMode } from './postgres-url';
import * as schema from '@/db/schema';

/**
 * Acceso a datos sobre PostgreSQL convencional.
 *
 * Antes había tres clientes distintos —neon-http para lecturas, otro neon-http
 * con `isolationLevel: 'Serializable'` para el ledger, y un pool WebSocket para
 * transacciones interactivas— porque el driver HTTP de Neon no soporta
 * `db.transaction()`. Con `pg` esa división desaparece: un único pool sirve
 * para todo y las transacciones interactivas son de primera clase.
 *
 * `serializableDb` y `getTransactionalDb()` se conservan como alias del mismo
 * pool. No son deuda: mantenerlos evita tocar decenas de consumidores y 32
 * mocks de tests en el mismo cambio en que se sustituye el driver. Se pueden
 * unificar más adelante, en un PR que no mezcle las dos cosas.
 */

const pool = new Pool({
  connectionString: normalizePostgresSslMode(env.DATABASE_URL),
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  // Corta consultas desbocadas en el servidor, no solo en el cliente: sin esto
  // una query bloqueada retiene su conexión hasta que el pool se agota.
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  // Permite que el proceso termine sin esperar a conexiones ociosas. Importante
  // para los scripts de un solo uso y para un apagado ordenado del contenedor.
  allowExitOnIdle: true,
});

// Un error en una conexión ociosa no debe tumbar el proceso. `pg` emite
// 'error' en el pool cuando el servidor cierra una conexión inactiva —algo
// perfectamente normal— y sin este listener Node lo trataría como excepción
// no capturada.
pool.on('error', () => {
  console.error('[db] error en una conexión ociosa del pool');
});

export const db = drizzle(pool, { schema });

/**
 * Alias de `db`. El aislamiento SERIALIZABLE ya no se fija en el cliente: se
 * declara por transacción en `atomicOperations.ts`, que es donde importa y
 * donde además puede reintentarse ante un fallo de serialización (40001).
 */
export const serializableDb = db;

/** Alias de `db`. Con `pg` toda instancia admite transacciones interactivas. */
export function getTransactionalDb(): typeof db {
  return db;
}

/** Cierra el pool. Lo usa el apagado ordenado del servidor y los scripts. */
export async function closeDbPool(): Promise<void> {
  await pool.end();
}

/**
 * Ejecuta SQL crudo y devuelve las filas.
 *
 * Existe porque varias rutas OG usaban `db.$client` como tagged template: con
 * el cliente HTTP de Neon eso era una función que resolvía directamente a un
 * array de filas. Con `pg`, `$client` es el `Pool` y no es invocable. Este
 * helper deja las llamadas igual de cortas sin depender del driver.
 */
export async function rawRows<T extends Record<string, unknown> = Record<string, unknown>>(
  query: SQL,
): Promise<T[]> {
  const resultado = await db.execute<T>(query);
  const filas = (resultado as unknown as { rows?: T[] }).rows;
  return Array.isArray(filas) ? filas : (resultado as unknown as T[]);
}
