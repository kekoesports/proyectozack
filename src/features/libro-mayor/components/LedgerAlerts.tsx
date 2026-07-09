import type { Alert, AlertLevel } from '@/features/libro-mayor/normalizer/alerts';

const LEVEL_STYLES: Record<AlertLevel, { badge: string; container: string; icon: string; label: string }> = {
  error: {
    badge: 'bg-red-500/25 text-red-300',
    container: 'border-red-500/30 bg-red-500/10',
    icon: '×',
    label: 'error',
  },
  critical: {
    badge: 'bg-red-500/25 text-red-300',
    container: 'border-red-500/30 bg-red-500/10',
    icon: '!',
    label: 'crítica',
  },
  warning: {
    badge: 'bg-amber-500/25 text-amber-300',
    container: 'border-amber-500/30 bg-amber-500/10',
    icon: '⚠',
    label: 'aviso',
  },
  info: {
    badge: 'bg-sky-500/25 text-sky-300',
    container: 'border-sky-500/30 bg-sky-500/10',
    icon: 'i',
    label: 'info',
  },
};

type Props = {
  readonly alerts: readonly Alert[];
};

export function LedgerAlerts({ alerts }: Props): React.ReactElement {
  if (alerts.length === 0) {
    return (
      <section aria-label="Alertas contables" className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
        <h2 className="text-lg font-bold text-sp-admin-fg">Alertas</h2>
        <p className="mt-2 text-sm text-sp-admin-muted">Sin alertas para este periodo.</p>
      </section>
    );
  }

  return (
    <section aria-label="Alertas contables" className="space-y-3">
      <h2 className="text-lg font-bold text-sp-admin-fg">
        Alertas ({alerts.length})
      </h2>
      <ul className="space-y-2">
        {alerts.map((a, i) => {
          const style = LEVEL_STYLES[a.level];
          return (
            <li
              key={`${a.code}-${i}`}
              className={`rounded-xl border p-4 ${style.container}`}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-black text-[11px] ${style.badge}`}
                >
                  {style.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="text-sm font-semibold text-sp-admin-fg">{a.title}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${style.badge} px-1.5 py-0.5 rounded`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-sp-admin-muted">{a.description}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
