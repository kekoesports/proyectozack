import type { FinanceAlert, FinanceAlertSeverity } from '@/types/financeDashboard';

interface Props {
  readonly alerts: readonly FinanceAlert[];
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

function severityStyle(sev: FinanceAlertSeverity): { readonly border: string; readonly bg: string; readonly text: string; readonly emoji: string } {
  switch (sev) {
    case 'high':   return { border: 'border-red-500/40',   bg: 'bg-red-500/5',    text: 'text-red-400',    emoji: '🔴' };
    case 'medium': return { border: 'border-amber-500/40', bg: 'bg-amber-500/5',  text: 'text-amber-400',  emoji: '🟠' };
    case 'low':    return { border: 'border-slate-500/40', bg: 'bg-slate-500/5',  text: 'text-slate-400',  emoji: '⚪' };
  }
}

/**
 * Bloque "Alertas inteligentes" — usa `deriveAlerts` upstream y las
 * pinta con severidad. Si no hay alertas, muestra "Todo al día."
 */
export function AlertasBloque({ alerts }: Props): React.ReactElement {
  return (
    <section aria-labelledby="alertas-title" className="rounded-2xl border border-sp-border bg-sp-admin-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden>🚨</span>
        <h2 id="alertas-title" className="text-sm font-bold text-sp-admin-fg">Alertas financieras</h2>
        {alerts.length > 0 ? (
          <span className="ml-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
            {alerts.length}
          </span>
        ) : null}
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-emerald-400 font-medium">
          <span aria-hidden>✅</span> Todo al día.
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a, idx) => {
            const s = severityStyle(a.severity);
            return (
              <li
                key={`${a.type}-${idx}`}
                className={`rounded-lg border ${s.border} ${s.bg} px-3 py-2 flex items-start gap-2.5`}
              >
                <span className="text-xs shrink-0 pt-0.5" aria-hidden>{s.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${s.text}`}>{a.message}</p>
                  {(a.count || a.amount) ? (
                    <p className="text-[11px] text-sp-admin-muted mt-0.5">
                      {a.count ? `${a.count} elemento${a.count === 1 ? '' : 's'}` : ''}
                      {a.count && a.amount ? ' · ' : ''}
                      {a.amount ? fmt(a.amount) : ''}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
