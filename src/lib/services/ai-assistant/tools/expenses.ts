'server-only';

import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { recurringExpenses } from '@/db/schema';

export type RecurringExpenseSummary = {
  readonly id: number;
  readonly name: string;
  readonly concept: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly category: string | null;
  readonly active: boolean;
  readonly dayOfMonth: number;
};

export async function getRecurringExpensesSummary(): Promise<readonly RecurringExpenseSummary[]> {
  const rows = await db
    .select({
      id: recurringExpenses.id,
      name: recurringExpenses.name,
      concept: recurringExpenses.concept,
      amount: recurringExpenses.amount,
      currency: recurringExpenses.currency,
      category: recurringExpenses.category,
      active: recurringExpenses.active,
      dayOfMonth: recurringExpenses.dayOfMonth,
    })
    .from(recurringExpenses)
    .where(eq(recurringExpenses.active, true))
    .orderBy(desc(recurringExpenses.amount));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    concept: r.concept,
    amount: parseFloat(r.amount ?? '0'),
    currency: r.currency ?? 'EUR',
    category: r.category,
    active: r.active ?? true,
    dayOfMonth: r.dayOfMonth ?? 1,
  }));
}

export type MonthlyExpenseTotal = {
  readonly totalRecurring: number;
  readonly count: number;
  readonly byCategory: ReadonlyArray<{ category: string; total: number }>;
};

export async function getMonthlyExpenseSummary(): Promise<MonthlyExpenseTotal> {
  const rows = await getRecurringExpensesSummary();
  const total = rows.reduce((acc, r) => acc + r.amount, 0);

  const byCat = new Map<string, number>();
  for (const r of rows) {
    const cat = r.category ?? 'Sin categoría';
    byCat.set(cat, (byCat.get(cat) ?? 0) + r.amount);
  }

  return {
    totalRecurring: Math.round(total * 100) / 100,
    count: rows.length,
    byCategory: Array.from(byCat.entries())
      .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total),
  };
}
