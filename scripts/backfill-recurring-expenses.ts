/**
 * Backfill de gastos recurrentes.
 *
 * 1. Inserta la plantilla "Cuota autónomo" si no existe.
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

const CUOTA_AUTONOMO = {
  name: 'Cuota autónomo',
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

async function main(): Promise<void> {
  // 1. Upsert de la plantilla
  const [existing] = await db
    .select()
    .from(schema.recurringExpenses)
    .where(eq(schema.recurringExpenses.name, CUOTA_AUTONOMO.name))
    .limit(1);

  let templateId: number;
  if (existing) {
    templateId = existing.id;
    console.log(`[cuota-autonomo] Plantilla ya existe (id=${templateId}) — actualizando amount.`);
    await db
      .update(schema.recurringExpenses)
      .set({ amount: CUOTA_AUTONOMO.amount })
      .where(eq(schema.recurringExpenses.id, templateId));
  } else {
    const [inserted] = await db
      .insert(schema.recurringExpenses)
      .values(CUOTA_AUTONOMO)
      .returning({ id: schema.recurringExpenses.id });
    templateId = inserted!.id;
    console.log(`[cuota-autonomo] Plantilla creada (id=${templateId}).`);
  }

  // 2. Generar invoices para todos los meses desde startDate hasta hoy
  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonthN = now.getMonth() + 1; // 1-based

  let created = 0;
  let skipped = 0;

  let cursorYear = 2026;
  let cursorMonthN = 1; // January 2026

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
      console.log(`[cuota-autonomo] ${monthStr} → ya existe (invoice ${exists.id}), skip.`);
      skipped++;
    } else {
      const lastDay = new Date(yyyy, cursorMonthN, 0).getDate();
      const day = Math.min(CUOTA_AUTONOMO.dayOfMonth, lastDay);
      const issueDate = `${yyyy}-${mm}-${String(day).padStart(2, '0')}`;
      const net = Number(CUOTA_AUTONOMO.amount);
      const total = net; // vatPct=0, withholdingPct=0

      const [inserted] = await db
        .insert(schema.invoices)
        .values({
          kind: 'expense',
          scope: CUOTA_AUTONOMO.scope,
          concept: CUOTA_AUTONOMO.concept,
          category: CUOTA_AUTONOMO.category,
          counterpartyName: CUOTA_AUTONOMO.counterpartyName,
          netAmount: net.toFixed(2),
          vatPct: CUOTA_AUTONOMO.vatPct,
          withholdingPct: CUOTA_AUTONOMO.withholdingPct,
          totalAmount: total.toFixed(2),
          paidAmount: '0.00',
          currency: CUOTA_AUTONOMO.currency,
          issueDate,
          status: 'pendiente',
          company: CUOTA_AUTONOMO.company,
          paymentMethod: CUOTA_AUTONOMO.paymentMethod,
          txId,
        })
        .returning({ id: schema.invoices.id });

      console.log(`[cuota-autonomo] ${monthStr} → creada invoice ${inserted!.id} (${issueDate}).`);
      created++;
    }

    cursorMonthN++;
    if (cursorMonthN > 12) { cursorMonthN = 1; cursorYear++; }
  }

  console.log(`\n✓ Backfill completado: ${created} creadas, ${skipped} ya existían.`);
}

main().catch((err) => {
  console.error('[backfill] Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
