/**
 * Guarda contra migraciones que el migrador saltaría en silencio.
 *
 * Drizzle aplica una migración solo si su `when` supera el `created_at` de la
 * última registrada en la base:
 *
 *   if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis)
 *   // drizzle-orm/node-postgres/migrator.js — folderMillis === journalEntry.when
 *
 * Cuando una migración pendiente nace por debajo de ese suelo, el migrador la
 * da por aplicada y sigue: sin error, sin aviso, y el deploy termina en verde
 * con la migración sin aplicar. Pasó con 0120 el 2026-08-20 y se detectó
 * consultando la base, no por el deploy.
 *
 * El suelo lo marca el `created_at` REAL de la base, que puede ser mayor que
 * cualquier `when` del journal local: basta con que otra rama haya aplicado una
 * migración que este checkout todavía no tiene. Por eso la comprobación va aquí
 * y no en un test — un test solo puede mirar el fichero.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

type JournalEntry = { idx: number; when: number; tag: string };

export type SkipGuardResult =
  | { ok: true; pendientes: number }
  | { ok: false; suelo: number; saltadas: readonly { tag: string; when: number }[] };

/**
 * Lo mínimo que necesita este guard de un cliente PostgreSQL. Antes recibía el
 * tagged template de `neon()`, que resolvía directamente a un array de filas;
 * `pg` devuelve `{ rows }`, así que ahora se pide `query()` y punto.
 */
type Consultable = {
  query: (text: string) => Promise<{ rows: unknown[] }>;
};

/**
 * Qué cuenta como "ya aplicada".
 *
 * Se compara por `created_at`, no por el hash del fichero. Drizzle inserta
 * `created_at = folderMillis`, es decir el mismo `when` del journal, así que la
 * correspondencia es exacta. El hash NO sirve: se calcula sobre el contenido
 * del `.sql` y en un checkout de Windows los finales de línea son CRLF mientras
 * que el deploy lo aplicó con LF, de modo que el sha256 difiere y todas las
 * migraciones parecerían pendientes. Comparado por hash, este guard abortaba
 * los deploys marcando 27 falsos positivos.
 */
export async function checkMigrationsWillApply(
  cliente: Consultable,
  folder = './drizzle',
): Promise<SkipGuardResult> {
  const journal = JSON.parse(
    readFileSync(join(folder, 'meta', '_journal.json')).toString(),
  ) as { entries: JournalEntry[] };

  let filas: { created_at: string }[];
  try {
    const res = await cliente.query('SELECT created_at FROM drizzle.__drizzle_migrations');
    filas = res.rows as { created_at: string }[];
  } catch {
    // Base sin inicializar: no hay suelo que superar.
    return { ok: true, pendientes: journal.entries.length };
  }

  const aplicadas = new Set(filas.map((f) => Number(f.created_at)));
  const suelo = filas.reduce((max, f) => Math.max(max, Number(f.created_at)), 0);

  const pendientes = journal.entries.filter((e) => !aplicadas.has(e.when));
  const saltadas = pendientes
    .filter((e) => e.when <= suelo)
    .map((e) => ({ tag: e.tag, when: e.when }));

  if (saltadas.length > 0) return { ok: false, suelo, saltadas };
  return { ok: true, pendientes: pendientes.length };
}
