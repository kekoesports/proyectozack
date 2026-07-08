/**
 * Purga manual de eventos antiguos en `sp_audit_events`.
 *
 * Uso:
 *
 *   # Dry-run (default):
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/purge-audit-events.ts
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/purge-audit-events.ts --older-than-days=365
 *
 *   # Ejecución real (requiere guard explícito):
 *   DOTENV_CONFIG_PATH=.env.local \
 *   CONFIRM_PURGE_AUDIT_EVENTS=I_ACCEPT_PURGE_AUDIT_EVENTS \
 *   npx tsx -r dotenv/config scripts/purge-audit-events.ts --older-than-days=730
 *
 * Reglas:
 *   - Dry-run por defecto — nunca borra si no está el guard exacto.
 *   - Guard: `CONFIRM_PURGE_AUDIT_EVENTS === 'I_ACCEPT_PURGE_AUDIT_EVENTS'`.
 *   - Retención por defecto: 730 días (~2 años).
 *   - Solo procesa filas con `created_at < NOW() - INTERVAL '<days> days'`.
 *   - Salida agrupada por `action` + total. Sin datos sensibles.
 *
 * Ver `docs/legal/audit-retention.md` para política.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { lt, sql } from 'drizzle-orm';
import { giveawayAuditEvents } from '../src/db/schema/giveawayAuditEvents';

export const PURGE_GUARD_ENV = 'CONFIRM_PURGE_AUDIT_EVENTS';
export const PURGE_GUARD_VALUE = 'I_ACCEPT_PURGE_AUDIT_EVENTS';
export const PURGE_DEFAULT_DAYS = 730;
export const PURGE_MIN_DAYS = 30;
export const PURGE_MAX_DAYS = 3650;

interface Args {
  readonly olderThanDays: number;
}

export function parseArgs(argv: readonly string[]): Args {
  let olderThanDays = PURGE_DEFAULT_DAYS;
  for (const arg of argv) {
    if (arg.startsWith('--older-than-days=')) {
      const raw = arg.slice('--older-than-days='.length);
      const n = Number(raw);
      if (!Number.isFinite(n) || n < PURGE_MIN_DAYS || n > PURGE_MAX_DAYS) {
        throw new Error(
          `--older-than-days debe estar entre ${PURGE_MIN_DAYS} y ${PURGE_MAX_DAYS} (recibido: "${raw}")`,
        );
      }
      olderThanDays = Math.floor(n);
    }
  }
  return { olderThanDays };
}

export function isPurgeConfirmed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[PURGE_GUARD_ENV] === PURGE_GUARD_VALUE;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const confirmed = isPurgeConfirmed();

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Missing DATABASE_URL — abort.');
    process.exit(1);
  }
  const client = neon(url);
  const db = drizzle(client);

  const cutoff = new Date(Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000);
  console.log(`── purge-audit-events ──────────────────────────────────`);
  console.log(`Modo:        ${confirmed ? 'REAL (borrado)' : 'dry-run'}`);
  console.log(`Retención:   ${args.olderThanDays} días`);
  console.log(`Cutoff:      < ${cutoff.toISOString()}`);
  console.log(`──────────────────────────────────────────────────────`);

  const rowsByAction = await db
    .select({
      action: giveawayAuditEvents.action,
      count: sql<number>`count(*)::int`,
    })
    .from(giveawayAuditEvents)
    .where(lt(giveawayAuditEvents.createdAt, cutoff))
    .groupBy(giveawayAuditEvents.action);

  const total = rowsByAction.reduce((acc, r) => acc + Number(r.count), 0);

  if (rowsByAction.length === 0 || total === 0) {
    console.log('Sin eventos en el rango. Nada que hacer.');
    return;
  }

  console.log('Conteo por acción:');
  for (const r of rowsByAction) {
    console.log(`  ${r.action.padEnd(28)} ${String(r.count).padStart(8)}`);
  }
  console.log(`  ${''.padEnd(28)} ${'─'.repeat(8)}`);
  console.log(`  ${'TOTAL'.padEnd(28)} ${String(total).padStart(8)}`);

  if (!confirmed) {
    console.log('');
    console.log(`⚠  DRY-RUN — no se ha borrado nada.`);
    console.log(`   Para borrar realmente, exporta:`);
    console.log(`   ${PURGE_GUARD_ENV}=${PURGE_GUARD_VALUE}`);
    console.log(`   y vuelve a ejecutar el script con los MISMOS argumentos.`);
    return;
  }

  console.log('');
  console.log('Ejecutando DELETE …');
  const deleted = await db.delete(giveawayAuditEvents).where(lt(giveawayAuditEvents.createdAt, cutoff));
  const affected = typeof deleted === 'object' && deleted !== null && 'rowCount' in deleted
    ? (deleted as { rowCount: number | null }).rowCount ?? total
    : total;
  console.log(`✓ Borrados ${affected} eventos.`);
}

if (require.main === module) {
  main()
    .catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    })
    .finally(() => process.exit(0));
}
