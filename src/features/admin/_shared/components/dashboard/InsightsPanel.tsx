import Link from 'next/link';
import type { InsightItem } from '@/lib/mock-dashboard-data';

const TYPE_STYLES: Record<InsightItem['type'], { bar: string; bg: string; icon: string; label: string }> = {
  danger:  { bar: 'bg-red-500',     bg: 'bg-red-50',     icon: '⚠',  label: 'Riesgo' },
  warning: { bar: 'bg-amber-400',   bg: 'bg-amber-50',   icon: '!',   label: 'Alerta' },
  success: { bar: 'bg-emerald-500', bg: 'bg-emerald-50', icon: '✓',  label: 'OK' },
};

type InsightsPanelProps = {
  readonly insights: readonly InsightItem[];
};

export function InsightsPanel({ insights }: InsightsPanelProps): React.ReactElement {
  return (
    <section className="flex flex-col rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-4 py-2 border-b border-sp-admin-border/60 bg-sp-admin-hover/40">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
          Insights
        </h2>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {insights.map((insight) => {
          const s = TYPE_STYLES[insight.type];
          return (
            <div
              key={insight.id}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg ${s.bg} border border-opacity-30 ${
                insight.type === 'danger' ? 'border-red-200' :
                insight.type === 'warning' ? 'border-amber-200' :
                'border-emerald-200'
              }`}
            >
              {/* Bar */}
              <div className={`w-0.5 self-stretch rounded-full ${s.bar} shrink-0`} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-sp-admin-text leading-snug">
                  {insight.text}
                </p>
                {insight.action && insight.actionHref && (
                  <Link
                    href={insight.actionHref}
                    prefetch={false}
                    className={`text-[10px] font-bold uppercase tracking-wide mt-1.5 inline-block ${
                      insight.type === 'danger' ? 'text-red-600 hover:text-red-700' :
                      insight.type === 'warning' ? 'text-amber-600 hover:text-amber-700' :
                      'text-emerald-600 hover:text-emerald-700'
                    } transition-colors`}
                  >
                    {insight.action} →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-2.5 border-t border-sp-admin-border/40 bg-sp-admin-hover/20">
        <p className="text-[9px] text-sp-admin-muted/50 italic uppercase tracking-wide">
          Datos de ejemplo — conectar a backend
        </p>
      </div>
    </section>
  );
}
