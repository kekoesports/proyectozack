import Link from 'next/link';
import { getRecentNewsAlerts, getUnreadNewsAlertsCount } from '@/lib/queries/newsAlerts';

const CATEGORY_LABEL: Record<string, string> = {
  regulatory: '🔴',
  competitor: '🟠',
  brand: '🟡',
  sector: '📰',
  own: '🔵',
};

function timeAgo(d: Date | null): string {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Ahora';
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

export async function NewsAlertsWidget() {
  const [alerts, unreadCount] = await Promise.all([
    getRecentNewsAlerts(5),
    getUnreadNewsAlertsCount(),
  ]);

  return (
    <div className="rounded-xl border border-sp-border bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-sp-admin-text">
            Alertas editoriales
          </h2>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[1.25rem] leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <Link href="/admin/alertas" className="text-xs text-sp-orange hover:text-sp-pink transition-colors font-semibold">
          Ver todas →
        </Link>
      </div>

      {alerts.length === 0 ? (
        <p className="text-xs text-sp-admin-muted py-4 text-center">
          Sin alertas todavía. El cron sincroniza a las 07:00 UTC.
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex gap-2 items-start">
              <span className="text-base shrink-0 mt-0.5">{CATEGORY_LABEL[alert.category] ?? '📌'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-snug line-clamp-2 ${!alert.readAt ? 'font-semibold text-sp-admin-text' : 'text-sp-admin-muted'}`}>
                  {alert.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {alert.sourceName && (
                    <span className="text-[10px] text-sp-admin-muted truncate max-w-[120px]">{alert.sourceName}</span>
                  )}
                  <span className="text-[10px] text-sp-admin-muted ml-auto shrink-0">{timeAgo(alert.publishedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
