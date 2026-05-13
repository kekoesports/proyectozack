import type { ActivityItem, ActivityIcon } from '@/lib/mock-dashboard-data';

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Ahora mismo';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}

const ICON_CONFIG: Record<ActivityIcon, { emoji: string; bg: string; color: string }> = {
  brand:   { emoji: '🏢', bg: '#5b9bd510', color: '#5b9bd5' },
  lead:    { emoji: '🎯', bg: '#8b3aad10', color: '#8b3aad' },
  deal:    { emoji: '🤝', bg: '#16a34a10', color: '#16a34a' },
  task:    { emoji: '✓',  bg: '#f5632a10', color: '#f5632a' },
  invoice: { emoji: '€',  bg: '#e8a80010', color: '#e8a800' },
  talent:  { emoji: '⭐', bg: '#c4288010', color: '#c42880' },
};

type ActivityPanelProps = {
  readonly items: readonly ActivityItem[];
};

export function ActivityPanel({ items }: ActivityPanelProps): React.ReactElement {
  return (
    <section className="flex flex-col rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-4 py-2 border-b border-sp-admin-border/60 bg-sp-admin-hover/40">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
          Actividad reciente
        </h2>
      </div>

      <div>
        {items.map((item) => {
          const cfg = ICON_CONFIG[item.icon];
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 px-4 py-2 border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors"
            >
              {/* Icon */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] shrink-0 mt-0.5"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.emoji}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-sp-admin-text leading-snug">
                  {item.text}
                </p>
                <p className="text-[11px] text-sp-admin-muted mt-0.5 truncate">
                  {item.entity}
                </p>
              </div>

              {/* Time */}
              <span className="text-[10px] text-sp-admin-muted/60 shrink-0 mt-0.5 tabular-nums">
                {timeAgo(item.time)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer mock note */}
      <div className="px-5 py-2.5 border-t border-sp-admin-border/40 bg-sp-admin-hover/20">
        <p className="text-[9px] text-sp-admin-muted/50 italic uppercase tracking-wide">
          Datos de ejemplo — conectar a backend
        </p>
      </div>
    </section>
  );
}
