/**
 * Backfill de gastos recurrentes — Cuota de autónomo (Keko + Zack).
 *
 * 1. Upsert de ambas plantillas (crea si no existe, actualiza amount si ya existe).
 * 2. Para cada mes desde startDate hasta el mes actual, crea una invoice si no existe.
 *
 * Idempotente: seguro correr varias veces.
 *
 * Uso:
 *   npx tsx scripts/backfill-recurring-expenses.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import * as schema from '../src/db/schema';

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  process.env[key] = val;
}

const sql = neon(process.env['DATABASE_URL']!);
const db = drizzle(sql, { schema });

const BASE = {
  concept: 'Cuota de autónomo',
  amount: '315.00',
  currency: 'EUR',
  vatPct: '0.00',
  withholdingPct: '0.00',
  category: 'Fiscal',
  counterpartyName: 'Tesorería General de la Seguridad Social',
  scope: 'company' as const,
  company: 'spain' as const,
  paymentMethod: 'banco' as const,
  dayOfMonth: 1,
  startDate: '2026-01-01',
  endDate: null,
  active: true,
};

// Dos plantillas: una por socio. El name es la clave de idempotencia del upsert.
// La plantilla antigua "Cuota autónomo" (sin socio) corresponde a Keko;
// el script la renombra si encuentra el nombre legacy.
const TEMPLATES = [
  { ...BASE, name: 'Cuota autónomo — Keko', legacyName: 'Cuota autónomo' },
  { ...BASE, name: 'Cuota autónomo — Zack', concept: 'Cuota de autónomo — Zack' },
];

async function upsertTemplate(tpl: typeof TEMPLATES[number]): Promise<number> {
  // Buscar por nombre definitivo
  const [byName] = await db
    .select()
    .from(schema.recurringExpenses)
    .where(eq(schema.recurringExpenses.name, tpl.name))
    .limit(1);

  if (byName) {
    await db.update(schema.recurringExpenses)
      .set({ amount: tpl.amount })
      .where(eq(schema.recurringExpenses.id, byName.id));
    console.log(`[${tpl.name}] Plantilla ya existe (id=${byName.id}) — amount actualizado.`);
    return byName.id;
  }

  // Buscar por nombre legacy (solo aplica a Keko)
  if ('legacyName' in tpl && tpl.legacyName) {
    const [byLegacy] = await db
      .select()
      .from(schema.recurringExpenses)
      .where(eq(schema.recurringExpenses.name, tpl.legacyName))
      .limit(1);

    if (byLegacy) {
      await db.update(schema.recurringExpenses)
        .set({ name: tpl.name, amount: tpl.amount })
        .where(eq(schema.recurringExpenses.id, byLegacy.id));
      console.log(`[${tpl.name}] Renombrado desde "${tpl.legacyName}" (id=${byLegacy.id}).`);
      return byLegacy.id;
    }
  }

  const { legacyName: _legacy, ...values } = tpl as typeof TEMPLATES[number] & { legacyName?: string };
  const [inserted] = await db
    .insert(schema.recurringExpenses)
    .values(values)
    .returning({ id: schema.recurringExpenses.id });
  console.log(`[${tpl.name}] Plantilla creada (id=${inserted!.id}).`);
  return inserted!.id;
}

async function backfillInvoices(templateId: number, tpl: typeof TEMPLATES[number]): Promise<void> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthN = now.getMonth() + 1;

  let created = 0;
  let skipped = 0;

  let cursorYear = 2026;
  let cursorMonthN = 1;

  while (
    cursorYear < currentYear ||
    (cursorYear === currentYear && cursorMonthN <= currentMonthN)
  ) {
    const yyyy = cursorYear;
    const mm = String(cursorMonthN).padStart(2, '0');
    const monthStr = `${yyyy}-${mm}`;
    const txId = `recurring:${templateId}:${monthStr}`;

    const [exists] = await db
      .select({ id: schema.invoices.id })
      .from(schema.invoices)
      .where(eq(schema.invoices.txId, txId))
      .limit(1);

    if (exists) {
      console.log(`  ${monthStr} → ya existe (invoice ${exists.id}), skip.`);
      skipped++;
    } else {
      const lastDay = new Date(yyyy, cursorMonthN, 0).getDate();
      const day = Math.min(tpl.dayOfMonth, lastDay);
      const issueDate = `${yyyy}-${mm}-${String(day).padStart(2, '0')}`;
      const net = Number(tpl.amount);
      const total = net; // vatPct=0, withholdingPct=0

      const [inserted] = await db
        .insert(schema.invoices)
        .values({
          kind: 'expense',
          scope: tpl.scope,
          concept: tpl.concept,
          category: tpl.category,
          counterpartyName: tpl.counterpartyName,
          netAmount: net.toFixed(2),
          vatPct: tpl.vatPct,
          withholdingPct: tpl.withholdingPct,
          totalAmount: total.toFixed(2),
          paidAmount: '0.00',
          currency: tpl.currency,
          issueDate,
          status: 'pendiente',
          company: tpl.company,
          paymentMethod: tpl.paymentMethod,
          txId,
        })
        .returning({ id: schema.invoices.id });

      console.log(`  ${monthStr} → creada invoice ${inserted!.id} (${issueDate}).`);
      created++;
    }

    cursorMonthN++;
    if (cursorMonthN > 12) { cursorMonthN = 1; cursorYear++; }
  }

  console.log(`  ✓ ${created} creadas, ${skipped} ya existían.\n`);
}

async function main(): Promise<void> {
  for (const tpl of TEMPLATES) {
    console.log(`\n=== ${tpl.name} ===`);
    const templateId = await upsertTemplate(tpl);
    await backfillInvoices(templateId, tpl);
  }
  console.log('✓ Backfill completo.');
}

main().catch((err) => {
  console.error('[backfill] Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
