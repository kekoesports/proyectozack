'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { NewsAlert, NewsAlertCategory } from '@/lib/queries/newsAlerts';
import { markNewsAlertReadAction, dismissNewsAlertAction, markAllReadAction } from '@/app/admin/(dashboard)/alertas/actions';

type Props = {
  alerts: NewsAlert[];
  activeCategory: NewsAlertCategory | 'all';
  onlyUnread: boolean;
  unreadCount: number;
};

const CATEGORY_LABELS: Record<NewsAlertCategory | 'all', string> = {
  all: 'Todas',
  regulatory: '🔴 Regulatorio',
  competitor: '🟠 Competidores',
  brand: '🟡 Marcas',
  sector: '📰 Sector',
  own: '🔵 Propia',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-blue-50 border-blue-200 text-blue-700',
};

function formatDate(d: Date | null): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

function AlertCard({ alert }: { alert: NewsAlert }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRead = () => {
    window.open(alert.sourceUrl, '_blank', 'noopener');
    if (!alert.readAt) {
      startTransition(async () => {
        await markNewsAlertReadAction(alert.id);
        router.refresh();
      });
    }
  };

  const handleDismiss = () => {
    startTransition(async () => {
      await dismissNewsAlertAction(alert.id);
      router.refresh();
    });
  };

  const isUnread = !alert.readAt;

  return (
    <div className={`rounded-xl border p-4 transition-opacity ${isPending ? 'opacity-50' : ''} ${isUnread ? 'bg-white border-sp-border' : 'bg-sp-admin-bg border-sp-border/50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[alert.priority] ?? ''}`}>
              {CATEGORY_LABELS[alert.category as NewsAlertCategory] ?? alert.category}
            </span>
            {alert.sourceName && (
              <span className="text-[11px] text-sp-admin-muted truncate">{alert.sourceName}</span>
            )}
            <span className="text-[11px] text-sp-admin-muted ml-auto shrink-0">
              {formatDate(alert.publishedAt)}
            </span>
          </div>

          <p className={`text-sm font-medium leading-snug mb-1 ${isUnread ? 'text-sp-admin-text' : 'text-sp-admin-muted'}`}>
            {alert.title}
          </p>

          {alert.snippet && (
            <p className="text-xs text-sp-admin-muted leading-relaxed line-clamp-2">{alert.snippet}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-sp-border/50">
        <button
          onClick={handleRead}
          disabled={isPending}
          className="text-xs font-semibold text-sp-orange hover:text-sp-pink transition-colors"
        >
          Leer artículo ↗
        </button>
        {isUnread && (
          <button
            onClick={() => startTransition(async () => { await markNewsAlertReadAction(alert.id); router.refresh(); })}
            disabled={isPending}
            className="text-xs text-sp-admin-muted hover:text-sp-admin-text transition-colors"
          >
            Marcar leída
          </button>
        )}
        <button
          onClick={handleDismiss}
          disabled={isPending}
          className="text-xs text-sp-admin-muted hover:text-red-500 transition-colors ml-auto"
        >
          Archivar
        </button>
      </div>
    </div>
  );
}

export function NewsAlertsView({ alerts, activeCategory, onlyUnread, unreadCount }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllReadAction();
      router.refresh();
    });
  };

  const categories: Array<NewsAlertCategory | 'all'> = ['all', 'regulatory', 'competitor', 'brand', 'sector', 'own'];

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <Link
            key={cat}
            href={`/admin/alertas?category=${cat}${onlyUnread ? '&view=unread' : ''}`}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === cat
                ? 'bg-sp-dark text-white border-sp-dark'
                : 'bg-white text-sp-admin-muted border-sp-border hover:border-sp-dark'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </Link>
        ))}

        <div className="ml-auto flex items-center gap-3">
          <Link
            href={`/admin/alertas?category=${activeCategory}&view=${onlyUnread ? '' : 'unread'}`}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              onlyUnread
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-sp-admin-muted border-sp-border hover:border-sp-dark'
            }`}
          >
            Solo no leídas {unreadCount > 0 ? `(${unreadCount})` : ''}
          </Link>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="text-xs text-sp-admin-muted hover:text-sp-admin-text transition-colors"
            >
              Marcar todas leídas
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {alerts.length === 0 ? (
        <div className="text-center py-16 text-sp-admin-muted">
          <p className="text-sm">Sin alertas {onlyUnread ? 'no leídas' : ''} en esta categoría.</p>
          <p className="text-xs mt-1">El cron sincroniza diariamente a las 07:00 UTC.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
