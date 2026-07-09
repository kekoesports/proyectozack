import type { LedgerAccount, LedgerReport } from '@/features/libro-mayor/parser/types';

/**
 * Agregados básicos sobre un LedgerReport. Pure functions, sin estado.
 */

export function accountsByPrefix(report: LedgerReport, prefix: string): readonly LedgerAccount[] {
  return report.accounts.filter((a) => a.code.startsWith(prefix));
}

export function sumTotals(accounts: readonly LedgerAccount[]): {
  totalDebe: number;
  totalHaber: number;
  totalSaldo: number;
  count: number;
} {
  let totalDebe = 0;
  let totalHaber = 0;
  let totalSaldo = 0;
  let count = 0;
  for (const a of accounts) {
    totalDebe += a.totalDebe;
    totalHaber += a.totalHaber;
    totalSaldo += a.totalSaldo;
    count += a.movements.length;
  }
  return { totalDebe, totalHaber, totalSaldo, count };
}

export function countMovements(report: LedgerReport): number {
  let n = 0;
  for (const a of report.accounts) n += a.movements.length;
  return n;
}
