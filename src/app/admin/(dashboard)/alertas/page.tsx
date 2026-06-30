import { requireAnyRole } from '@/lib/auth-guard';
import { getNewsAlerts, getUnreadNewsAlertsCount } from '@/lib/queries/newsAlerts';
import { NewsAlertsView } from '@/features/admin/newsAlerts/components/NewsAlertsView';
import type { NewsAlertCategory } from '@/lib/queries/newsAlerts';

type PageProps = {
  searchParams: Promise<{ category?: string; view?: string }>;
};

const VALID_CATEGORIES: readonly NewsAlertCategory[] = ['regulatory', 'competitor', 'brand', 'sector', 'own'];

export default async function AdminAlertasPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requireAnyRole(['admin', 'admin_limited_tasks', 'manager', 'editor', 'ops'], '/admin/login');

  const params = await searchParams;
  const rawCat = params.category ?? 'all';
  const category = (VALID_CATEGORIES.includes(rawCat as NewsAlertCategory) ? rawCat : 'all') as NewsAlertCategory | 'all';
  const onlyUnread = params.view === 'unread';

  const [alerts, unreadCount] = await Promise.all([
    getNewsAlerts({ category, onlyUnread, limit: 100 }),
    getUnreadNewsAlertsCount(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4">
        <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text">
          Alertas editoriales
        </h1>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 min-w-[1.5rem]">
            {unreadCount}
          </span>
        )}
      </div>

      <p className="text-sm text-sp-admin-muted -mt-3">
        Señales de noticias relevantes: regulatorio DGOJ, competidores, operadores y sector iGaming.
        Actualizado diariamente a las 07:00 UTC vía NewsData.io.
      </p>

      <NewsAlertsView
        alerts={alerts}
        activeCategory={category}
        onlyUnread={onlyUnread}
        unreadCount={unreadCount}
      />
    </div>
  );
}
