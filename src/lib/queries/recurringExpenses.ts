import { eq, and, lte, gte, or, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { recurringExpenses, invoices } from '@/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type RecurringExpense = InferSelectModel<typeof recurringExpenses>;
export type NewRecurringExpense = InferInsertModel<typeof recurringExpenses>;

export function listRecurringExpenses(): Promise<readonly RecurringExpense[]> {
  return db.select().from(recurringExpenses).orderBy(recurringExpenses.name);
}

export function getRecurringExpense(id: number): Promise<RecurringExpense | null> {
  return db.select().from(recurringExpenses).where(eq(recurringExpenses.id, id)).limit(1)
    .then(([r]) => r ?? null);
}

export function createRecurringExpense(values: NewRecurringExpense): Promise<RecurringExpense> {
  return db.insert(recurringExpenses).values(values).returning().then(([r]) => {
    if (!r) throw new Error('insert recurringExpense returned no row');
    return r;
  });
}

export function updateRecurringExpense(id: number, patch: Partial<NewRecurringExpense>): Promise<RecurringExpense | null> {
  return db.update(recurringExpenses).set(patch).where(eq(recurringExpenses.id, id)).returning()
    .then(([r]) => r ?? null);
}

/**
 * Returns all active templates that should have been generating invoices
 * up to (and including) the given month string 'YYYY-MM'.
 */
export async function getActiveTemplatesForMonth(monthStr: string): Promise<readonly RecurringExpense[]> {
  const monthStart = `${monthStr}-01`;
  return db.select().from(recurringExpenses).where(
    and(
      eq(recurringExpenses.active, true),
      lte(recurringExpenses.startDate, monthStart),
      or(
        isNull(recurringExpenses.endDate),
        gte(recurringExpenses.endDate, monthStart),
      ),
    ),
  );
}

/**
 * Checks if an invoice already exists for a given recurring template + month.
 * Uses txId='recurring:{templateId}:{YYYY-MM}' as idempotency key.
 */
export async function invoiceExistsForMonth(templateId: number, monthStr: string): Promise<boolean> {
  const txId = `recurring:${templateId}:${monthStr}`;
  const [row] = await db.select({ id: invoices.id }).from(invoices)
    .where(eq(invoices.txId, txId)).limit(1);
  return row !== undefined;
}

/**
 * Creates a single monthly invoice for a recurring expense template.
 * The issueDate is set to {YYYY}-{MM}-{dayOfMonth} (clamped to last day of month).
 */
export async function createInvoiceForMonth(
  template: RecurringExpense,
  monthStr: string, // 'YYYY-MM'
): Promise<number> {
  const [year, month] = monthStr.split('-').map(Number) as [number, number];
  const lastDay = new Date(year, month, 0).getDate(); // day 0 of next month = last day of current
  const day = Math.min(template.dayOfMonth, lastDay);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const issueDate = `${year}-${mm}-${dd}`;

  const txId = `recurring:${template.id}:${monthStr}`;
  const net = Number(template.amount);
  const vat = Number(template.vatPct);
  const w = Number(template.withholdingPct);
  const total = net * (1 + (vat - w) / 100);

  const [row] = await db.insert(invoices).values({
    kind: 'expense',
    scope: template.scope,
    concept: template.concept,
    category: template.category ?? undefined,
    counterpartyName: template.counterpartyName ?? undefined,
    netAmount: net.toFixed(2),
    vatPct: template.vatPct,
    withholdingPct: template.withholdingPct,
    totalAmount: total.toFixed(2),
    paidAmount: '0.00',
    currency: template.currency,
    issueDate,
    status: 'pendiente',
    company: template.company ?? undefined,
    paymentMethod: template.paymentMethod ?? undefined,
    txId,
    notes: template.notes ?? undefined,
  }).returning({ id: invoices.id });

  if (!row) throw new Error('insert invoice for recurring expense returned no row');
  return row.id;
}
