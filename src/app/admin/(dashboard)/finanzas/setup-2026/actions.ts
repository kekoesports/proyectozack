'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { logRedacted } from '@/lib/log';
import {
  applySetup2026,
  getExistingSetupTxIds,
  getExistingRecurringNames,
  previewSetup2026,
} from '@/lib/queries/setup2026';
import { EXPENSE_SUBTYPES } from '@/lib/schemas/invoice';
import type { HistoricalExpenseRow, RecurringExpenseRow, ApplyResult } from '@/lib/finance/setup2026/types';

type ActionResult<T = void> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: string };

// ── Zod schemas ───────────────────────────────────────────────────────────────

const historicalRowSchema = z.object({
  txId: z.string().min(1),
  include: z.boolean(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  concept: z.string().min(1),
  counterpartyName: z.string().min(1),
  netAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  vatPct: z.string().regex(/^\d+(\.\d{1,2})?$/),
  withholdingPct: z.string().regex(/^\d+(\.\d{1,2})?$/),
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  expenseGroup: z.literal('operational'),
  expenseSubtype: z.enum(EXPENSE_SUBTYPES),
  notes: z.string(),
  label: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  personKey: z.enum(['pablo', 'alfonso']).nullable(),
  categoryKey: z.string(),
});

const recurringRowSchema = z.object({
  key: z.string().min(1),
  include: z.boolean(),
  name: z.string().min(1),
  concept: z.string().min(1),
  counterpartyName: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  vatPct: z.string().regex(/^\d+(\.\d{1,2})?$/),
  withholdingPct: z.string().regex(/^\d+(\.\d{1,2})?$/),
  expenseGroup: z.literal('operational'),
  expenseSubtype: z.enum(EXPENSE_SUBTYPES),
  dayOfMonth: z.number().int().min(1).max(31),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string(),
  label: z.string(),
  categoryKey: z.string(),
});

const payloadSchema = z.object({
  historical: z.array(historicalRowSchema),
  recurring: z.array(recurringRowSchema),
});

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Preview: returns which txIds already exist and how many rows would be created.
 * Does NOT write to DB.
 */
export async function previewSetup2026Action(
  rawPayload: string,
): Promise<ActionResult<{ existing: readonly string[]; toCreate: number; recurringToCreate: number }>> {
  await requirePermission('facturacion', 'write');

  let parsed: z.infer<typeof payloadSchema>;
  try {
    parsed = payloadSchema.parse(JSON.parse(rawPayload));
  } catch {
    return { ok: false, error: 'Payload inválido' };
  }

  try {
    const result = await previewSetup2026(
      parsed.historical as HistoricalExpenseRow[],
      parsed.recurring as RecurringExpenseRow[],
    );
    return { ok: true, data: result };
  } catch (err) {
    logRedacted('error', '[setup2026] previewSetup2026 error:', err instanceof Error ? err.message : 'unknown');
    return { ok: false, error: 'Error al calcular el preview' };
  }
}

/**
 * Apply: creates invoices and recurring templates for rows that don't exist yet.
 * Idempotent via txId / name dedup.
 */
export async function applySetup2026Action(
  rawPayload: string,
): Promise<ActionResult<ApplyResult>> {
  await requirePermission('facturacion', 'write');

  let parsed: z.infer<typeof payloadSchema>;
  try {
    parsed = payloadSchema.parse(JSON.parse(rawPayload));
  } catch {
    return { ok: false, error: 'Payload inválido' };
  }

  const hasAnyIncluded =
    parsed.historical.some((r) => r.include) ||
    parsed.recurring.some((r) => r.include);
  if (!hasAnyIncluded) {
    return { ok: false, error: 'No hay filas seleccionadas para crear' };
  }

  let result: ApplyResult;
  try {
    const [existingTxIds, existingRecurringNames] = await Promise.all([
      getExistingSetupTxIds(),
      getExistingRecurringNames(),
    ]);

    result = await applySetup2026(
      parsed.historical as HistoricalExpenseRow[],
      parsed.recurring as RecurringExpenseRow[],
      existingTxIds,
      existingRecurringNames,
    );
  } catch (err) {
    logRedacted('error', '[setup2026] applySetup2026 error:', err instanceof Error ? err.message : 'unknown');
    return { ok: false, error: 'Error al crear los gastos' };
  }

  revalidatePath('/admin/finanzas');
  revalidatePath('/admin/finanzas/resumen');
  revalidatePath('/admin/finanzas/pl');
  revalidatePath('/admin/finanzas/gastos-operativos');

  return { ok: true, data: result };
}
