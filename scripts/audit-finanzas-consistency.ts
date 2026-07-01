/**
 * Auditoría read-only de consistencia en Finanzas.
 * NO modifica datos.
 *
 * 10 checks:
 *   1.  invoices activas con expenseGroup=null O expenseSubtype=null (excluyendo anuladas)
 *   2.  expenses scope=campaign sin campaignId
 *   3.  expenses expenseSubtype=pago_talento sin talentId
 *   4.  income scope=campaign sin brandId O sin campaignId
 *   5.  recurring_expenses active=true sin expenseSubtype
 *   6.  invoices status=vencida sin dueDate
 *   7.  invoices status=parcial sin fila en invoice_payments
 *   8.  issued_invoices status=cobrada sin invoice_payments
 *   9.  invoices status=pagada sin invoice_payments
 *   10. duplicados por txId (excluyendo NULL)
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/audit-finanzas-consistency.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { and, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { invoices } from '../src/db/schema/invoices';
import { issuedInvoices } from '../src/db/schema/issuedInvoices';
import { invoicePayments } from '../src/db/schema/invoicePayments';
import { recurringExpenses } from '../src/db/schema/recurringExpenses';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}
const db = drizzle(neon(url));

type Finding = { readonly check: string; readonly count: number; readonly sample: unknown[] };

function line(): void { console.log('─'.repeat(72)); }

async function run(): Promise<Finding[]> {
  const findings: Finding[] = [];

  // ── 1. invoices activas sin clasificar ────────────────────────────────
  {
    const rows = await db
      .select({
        id: invoices.id,
        issueDate: invoices.issueDate,
        concept: invoices.concept,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
        kind: invoices.kind,
        expenseGroup: invoices.expenseGroup,
        expenseSubtype: invoices.expenseSubtype,
      })
      .from(invoices)
      .where(
        and(
          ne(invoices.status, 'anulada'),
          or(isNull(invoices.expenseGroup), isNull(invoices.expenseSubtype)),
        ),
      );
    findings.push({
      check: 'invoices activas sin expenseGroup o expenseSubtype (excluye income)',
      count: rows.filter((r) => r.kind === 'expense').length,
      sample: rows.filter((r) => r.kind === 'expense').slice(0, 5),
    });
  }

  // ── 2. expenses scope=campaign sin campaignId ─────────────────────────
  {
    const rows = await db
      .select({
        id: invoices.id, issueDate: invoices.issueDate, concept: invoices.concept,
        totalAmount: invoices.totalAmount, status: invoices.status,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.kind, 'expense'),
          eq(invoices.scope, 'campaign'),
          isNull(invoices.campaignId),
          ne(invoices.status, 'anulada'),
        ),
      );
    findings.push({
      check: "expenses con scope='campaign' sin campaignId (activas)",
      count: rows.length,
      sample: rows.slice(0, 5),
    });
  }

  // ── 3. pago_talento sin talentId ──────────────────────────────────────
  {
    const rows = await db
      .select({
        id: invoices.id, issueDate: invoices.issueDate, concept: invoices.concept,
        totalAmount: invoices.totalAmount, campaignId: invoices.campaignId,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.kind, 'expense'),
          eq(invoices.expenseSubtype, 'pago_talento'),
          isNull(invoices.talentId),
          ne(invoices.status, 'anulada'),
        ),
      );
    findings.push({
      check: "expenseSubtype='pago_talento' sin talentId (activas)",
      count: rows.length,
      sample: rows.slice(0, 5),
    });
  }

  // ── 4. income scope=campaign sin brand ni campaign ────────────────────
  {
    const rows = await db
      .select({
        id: invoices.id, issueDate: invoices.issueDate, concept: invoices.concept,
        totalAmount: invoices.totalAmount, brandId: invoices.brandId, campaignId: invoices.campaignId,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.kind, 'income'),
          eq(invoices.scope, 'campaign'),
          or(isNull(invoices.brandId), isNull(invoices.campaignId)),
          ne(invoices.status, 'anulada'),
        ),
      );
    findings.push({
      check: "income con scope='campaign' sin brandId o sin campaignId (activas)",
      count: rows.length,
      sample: rows.slice(0, 5),
    });
  }

  // ── 5. recurring_expenses active sin subtype ──────────────────────────
  {
    const rows = await db
      .select({
        id: recurringExpenses.id, name: recurringExpenses.name,
        amount: recurringExpenses.amount, expenseSubtype: recurringExpenses.expenseSubtype,
      })
      .from(recurringExpenses)
      .where(
        and(
          eq(recurringExpenses.active, true),
          isNull(recurringExpenses.expenseSubtype),
        ),
      );
    findings.push({
      check: 'recurring_expenses active=true sin expenseSubtype',
      count: rows.length,
      sample: rows.slice(0, 5),
    });
  }

  // ── 6. status=vencida sin dueDate ─────────────────────────────────────
  {
    const rows = await db
      .select({
        id: invoices.id, issueDate: invoices.issueDate, concept: invoices.concept,
        totalAmount: invoices.totalAmount, kind: invoices.kind,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, 'vencida'),
          isNull(invoices.dueDate),
        ),
      );
    findings.push({
      check: "invoices status='vencida' sin dueDate",
      count: rows.length,
      sample: rows.slice(0, 5),
    });
  }

  // ── 7. status=parcial sin fila en invoice_payments ────────────────────
  {
    const rows = await db.execute(sql`
      SELECT i.id, i.issue_date AS "issueDate", i.concept, i.total_amount AS "totalAmount", i.kind, i.status
      FROM invoices i
      WHERE i.status = 'parcial'
        AND NOT EXISTS (
          SELECT 1 FROM invoice_payments p WHERE p.invoice_id = i.id
        )
      LIMIT 100
    `);
    const arr = (rows as unknown as { rows: unknown[] }).rows ?? (rows as unknown as unknown[]);
    findings.push({
      check: "invoices status='parcial' sin fila en invoice_payments",
      count: Array.isArray(arr) ? arr.length : 0,
      sample: Array.isArray(arr) ? arr.slice(0, 5) : [],
    });
  }

  // ── 8. issued_invoices status=cobrada sin invoice_payments ────────────
  {
    const rows = await db.execute(sql`
      SELECT ii.id, ii.invoice_number AS "invoiceNumber", ii.issue_date AS "issueDate",
             ii.total_amount AS "totalAmount", ii.status
      FROM issued_invoices ii
      WHERE ii.status = 'cobrada'
        AND NOT EXISTS (
          SELECT 1 FROM invoice_payments p WHERE p.issued_invoice_id = ii.id
        )
      LIMIT 100
    `);
    const arr = (rows as unknown as { rows: unknown[] }).rows ?? (rows as unknown as unknown[]);
    findings.push({
      check: "issued_invoices status='cobrada' sin invoice_payments",
      count: Array.isArray(arr) ? arr.length : 0,
      sample: Array.isArray(arr) ? arr.slice(0, 5) : [],
    });
  }

  // ── 9. invoices status=pagada sin invoice_payments ────────────────────
  {
    const rows = await db.execute(sql`
      SELECT i.id, i.issue_date AS "issueDate", i.concept,
             i.total_amount AS "totalAmount", i.kind, i.status
      FROM invoices i
      WHERE i.status = 'pagada'
        AND NOT EXISTS (
          SELECT 1 FROM invoice_payments p WHERE p.invoice_id = i.id
        )
      LIMIT 100
    `);
    const arr = (rows as unknown as { rows: unknown[] }).rows ?? (rows as unknown as unknown[]);
    findings.push({
      check: "invoices status='pagada' sin invoice_payments",
      count: Array.isArray(arr) ? arr.length : 0,
      sample: Array.isArray(arr) ? arr.slice(0, 5) : [],
    });
  }

  // ── 10. duplicados por txId (excluyendo NULL) ─────────────────────────
  {
    const rows = await db
      .select({ txId: invoices.txId, cnt: sql<number>`count(*)::int` })
      .from(invoices)
      .where(sql`${invoices.txId} IS NOT NULL`)
      .groupBy(invoices.txId)
      .having(sql`count(*) > 1`);
    findings.push({
      check: 'invoices con txId duplicado',
      count: rows.length,
      sample: rows.slice(0, 5),
    });
  }

  return findings;
}

async function main(): Promise<void> {
  console.log('\n╭─ audit-finanzas-consistency  [read-only, no modifica datos]');
  console.log('╰─ 10 checks de consistencia\n');

  const findings = await run();

  line();
  console.log('Resumen de hallazgos:');
  line();
  for (const [i, f] of findings.entries()) {
    const badge = f.count === 0 ? '✓' : '⚠';
    console.log(`  ${badge} ${i + 1}. ${f.check.padEnd(70)} → ${f.count}`);
  }
  line();

  console.log('\nDetalle (samples):\n');
  for (const [i, f] of findings.entries()) {
    if (f.count === 0) continue;
    console.log(`── ${i + 1}. ${f.check} (${f.count}) ──`);
    for (const s of f.sample) console.log(`  ${JSON.stringify(s)}`);
    console.log();
  }

  const totalHallazgos = findings.filter((f) => f.count > 0).length;
  console.log(`\n${totalHallazgos === 0 ? '✓' : '⚠'} ${totalHallazgos}/10 checks con hallazgos.`);
}

main().catch(console.error).finally(() => process.exit(0));
