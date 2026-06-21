'use client';

import type { FinanceAlert } from '@/types/financeDashboard';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function severityStyles(s: FinanceAlert['severity']): string {
  if (s === 'high') return 'border-red-500/40 bg-red-500/5 text-red-300';
  if (s === 'medium') return 'border-amber-500/40 bg-amber-500/5 text-amber-300';
  return 'border-sp-admin-border bg-sp-admin-card text-sp-admin-muted';
}

function severityIcon(s: FinanceAlert['severity']): string {
  if (s === 'high') return '🔴';
  if (s === 'medium') return '🟡';
  return '🔵';
}

type Props = {
  readonly alerts: readonly FinanceAlert[];
};

export function FinanceAlertsList({ alerts }: Props): React.ReactElement {
  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card px-5 py-6 text-center text-sm text-emerald-400">
        Sin alertas financieras activas
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert, i) => (
        <div
          key={`${alert.type}-${i}`}
          className={`flex items-center justify-between rounded-xl border px-4 py-3 ${severityStyles(alert.severity)}`}
        >
          <div className="flex items-center gap-2 text-sm">
            <span>{severityIcon(alert.severity)}</span>
            <span>{alert.message}</span>
          </div>
          {alert.amount !== undefined && (
            <span className="ml-4 shrink-0 text-sm font-semibold">
              {EUR.format(alert.amount)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
