/**
 * Herramienta interna manual — concesión de puntos SocialPro a un
 * usuario concreto. Uso: pruebas de canje, compensaciones de soporte,
 * campañas especiales manuales.
 *
 * ============================================================
 * NUNCA se ejecuta automáticamente. Bloqueado en CI/producción y
 * requiere env var explícita:
 *
 *   CONFIRM_ADMIN_GRANT_POINTS=I_ACCEPT_GRANT_POINTS \
 *     npx tsx --env-file=.env.local scripts/admin-grant-points.ts \
 *     --steam-id 76561198XXXXXXXXX \
 *     --amount 1000 \
 *     --reason "Test canje Glock-18 Block-18"
 *
 * Argumentos aceptados (exclusivos entre sí):
 *   --steam-id <steam64>         Concede al usuario cuyo player_profiles.steam_id coincide.
 *   --user-id  <auth-user-id>    Concede al usuario cuyo user.id coincide (bypass Steam).
 *
 * Obligatorios:
 *   --amount   <int>             Cantidad positiva de puntos. Rango 1..MAX_GRANT.
 *   --reason   <texto>           Justificación (concepto que queda en ledger).
 * ============================================================
 *
 * Modelo:
 *   - El saldo del usuario es SIEMPRE `SUM(coin_transactions.amount)`.
 *   - Este script NUNCA actualiza un balance cacheado — inserta UNA fila
 *     en `coin_transactions` con `amount > 0` y `source: 'admin'`.
 *   - El `reason` se guarda como `concept` (max 200 chars por schema).
 *   - No borra, no revierte, no toca redemptions ni shop_items.
 *
 * Rollback (compensación):
 *   Si te equivocas, el patrón es una TRANSACCIÓN NEGATIVA compensatoria
 *   con concept explícito ("Reverso de tx#N — motivo"). No hay flag de
 *   "amount negativo" en este script — si necesitas rollback, edita el
 *   script en una rama, cambia el guard MIN_AMOUNT y documenta el porqué.
 *   Ver docs/admin-points-operations.md §Rollback.
 */

import { and, eq, sql } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { coinTransactions, playerProfiles, user } from '../src/db/schema';

const CONFIRM_TOKEN = 'I_ACCEPT_GRANT_POINTS';

/** Cantidad máxima concedida por ejecución. Guard anti-typo. */
const MAX_GRANT = 100_000;
/** Cantidad mínima estricta. Este script NO permite valores negativos. */
const MIN_AMOUNT = 1;
/** Longitud máxima del concept (schema: varchar 200). */
const REASON_MAX_LEN = 200;

interface Args {
  steamId?: string;
  userId?: string;
  amount: number;
  reason: string;
}

function detectCiOrProd(): boolean {
  return (
    process.env.CI === 'true' ||
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    Boolean(process.env.GITHUB_ACTIONS)
  );
}

function parseArgs(argv: readonly string[]): Args | { error: string } {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg?.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) return { error: `Falta valor para --${key}` };
    map.set(key, next);
    i++;
  }

  const steamId = map.get('steam-id')?.trim();
  const userId = map.get('user-id')?.trim();
  const amountRaw = map.get('amount')?.trim();
  const reason = map.get('reason')?.trim();

  if (!steamId && !userId) {
    return { error: 'Debes pasar --steam-id o --user-id' };
  }
  if (steamId && userId) {
    return { error: 'Usa solo --steam-id o solo --user-id (no ambos)' };
  }
  if (!amountRaw) return { error: 'Falta --amount' };
  if (!reason) return { error: 'Falta --reason' };

  const amount = Number.parseInt(amountRaw, 10);
  if (!Number.isFinite(amount) || `${amount}` !== amountRaw) {
    return { error: `--amount debe ser un entero, recibido: "${amountRaw}"` };
  }
  if (amount < MIN_AMOUNT) {
    return { error: `--amount debe ser >= ${MIN_AMOUNT} (recibido: ${amount})` };
  }
  if (amount > MAX_GRANT) {
    return { error: `--amount excede el límite de ${MAX_GRANT} por ejecución (recibido: ${amount})` };
  }
  if (reason.length > REASON_MAX_LEN) {
    return { error: `--reason no debe superar ${REASON_MAX_LEN} caracteres (recibido: ${reason.length})` };
  }

  const result: Args = { amount, reason };
  if (steamId) result.steamId = steamId;
  if (userId) result.userId = userId;
  return result;
}

async function resolveTargetUser(args: Args): Promise<{ userId: string; steamId: string | null; name: string | null } | null> {
  if (args.userId) {
    const u = await db.query.user.findFirst({
      where: eq(user.id, args.userId),
      columns: { id: true, name: true },
    });
    if (!u) return null;
    const p = await db.query.playerProfiles.findFirst({
      where: eq(playerProfiles.userId, u.id),
      columns: { steamId: true },
    });
    return { userId: u.id, name: u.name ?? null, steamId: p?.steamId ?? null };
  }

  // steamId
  const p = await db.query.playerProfiles.findFirst({
    where: eq(playerProfiles.steamId, args.steamId!),
    columns: { userId: true, steamId: true },
  });
  if (!p) return null;
  const u = await db.query.user.findFirst({
    where: eq(user.id, p.userId),
    columns: { id: true, name: true },
  });
  if (!u) return null;
  return { userId: u.id, name: u.name ?? null, steamId: p.steamId };
}

async function getBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ balance: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)::int` })
    .from(coinTransactions)
    .where(eq(coinTransactions.userId, userId));
  return row?.balance ?? 0;
}

async function main() {
  // 1) Guards de entorno.
  if (detectCiOrProd()) {
    console.error(
      'Grant abortado: entorno CI o producción detectado.\n' +
      'Este script es una herramienta local dev/staff — no se ejecuta en CI ni desde\n' +
      'builds de producción. Correr solo desde una máquina de operador con .env.local.',
    );
    process.exit(1);
  }

  const confirm = process.env.CONFIRM_ADMIN_GRANT_POINTS;
  if (confirm !== CONFIRM_TOKEN) {
    console.error(
      'Grant abortado. Requiere env var explícita:\n' +
      `  CONFIRM_ADMIN_GRANT_POINTS=${CONFIRM_TOKEN} npx tsx --env-file=.env.local scripts/admin-grant-points.ts --steam-id <ID> --amount <N> --reason "<texto>"\n\n` +
      'Motivo: modifica el ledger de puntos de un usuario en la DB. Requiere\n' +
      'OK explícito antes de cada ejecución.',
    );
    process.exit(1);
  }

  // 2) Parseo y validación de args.
  const parsed = parseArgs(process.argv.slice(2));
  if ('error' in parsed) {
    console.error(`Argumentos inválidos: ${parsed.error}\n`);
    console.error('Uso:');
    console.error('  --steam-id <76561198…>       (o --user-id <auth-user-id>)');
    console.error(`  --amount   <entero 1..${MAX_GRANT}>`);
    console.error(`  --reason   "<texto max ${REASON_MAX_LEN} chars>"`);
    process.exit(1);
  }
  const args = parsed;

  // 3) Resolver usuario destino.
  const target = await resolveTargetUser(args);
  if (!target) {
    console.error(
      'Usuario no encontrado.\n' +
      (args.steamId ? `  --steam-id: ${args.steamId}\n` : '') +
      (args.userId ? `  --user-id:  ${args.userId}\n` : ''),
    );
    process.exit(1);
  }

  // 4) Snapshot saldo antes.
  const before = await getBalance(target.userId);

  console.log('\n=== Grant de puntos manual ===');
  console.log(`  Usuario:    ${target.name ?? '(sin nombre)'}`);
  console.log(`  Steam ID:   ${target.steamId ?? '(sin player_profile)'}`);
  console.log(`  User ID:    ${target.userId}`);
  console.log(`  Cantidad:   +${args.amount.toLocaleString('es-ES')} pts`);
  console.log(`  Reason:     ${args.reason}`);
  console.log(`  Saldo ant.: ${before.toLocaleString('es-ES')} pts`);
  console.log(`  Saldo post: ${(before + args.amount).toLocaleString('es-ES')} pts\n`);

  // 5) Insertar UNA fila en el ledger. source='admin' — ya existe en el
  //    tipo CoinSource y en la Column 'source' del schema.
  const [tx] = await db
    .insert(coinTransactions)
    .values({
      userId: target.userId,
      amount: args.amount,
      source: 'admin',
      concept: args.reason,
      // refId no aplica — no hay entidad origen (ni giveaway ni misión).
    })
    .returning({ id: coinTransactions.id, createdAt: coinTransactions.createdAt });

  if (!tx) {
    console.error('  ✗ INSERT devolvió 0 filas. Investigar antes de reintentar.');
    process.exit(1);
  }

  const after = await getBalance(target.userId);
  console.log(`✓ Grant aplicado — tx#${tx.id} @ ${tx.createdAt?.toISOString?.() ?? 'now'}`);
  console.log(`  Saldo verificado post-INSERT: ${after.toLocaleString('es-ES')} pts`);
}

main()
  .catch((err) => {
    console.error('Grant fallido:', err);
    process.exit(1);
  })
  .then(() => process.exit(0));
