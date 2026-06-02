'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { PostTopViewRow, PostViewsByDayRow } from '@/lib/queries/postAnalytics';

type Window = '7d' | '30d';

function windowCutoff(w: Window): string {
  const days = w === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

const WINDOWS: { value: Window; label: string }[] = [
  { value: '7d',  label: 'Últimos 7 días'  },
  { value: '30d', label: 'Últimos 30 días' },
];

type Props = {
  readonly topPosts: readonly PostTopViewRow[];
  readonly viewsByDay: readonly PostViewsByDayRow[];
};

export function PostEventsSection({ topPosts, viewsByDay }: Props): React.ReactElement {
  const [window, setWindow] = useState<Window>('30d');

  const cutoff = windowCutoff(window);

  const filteredTop = useMemo(() => {
    const field: keyof PostTopViewRow = window === '7d' ? 'views7d' : 'views30d';
    return [...topPosts]
      .sort((a, b) => (b[field] as number) - (a[field] as number))
      .slice(0, 5);
  }, [topPosts, window]);

  const totalViews = useMemo(
    () => viewsByDay.filter((r) => r.day >= cutoff).reduce((s, r) => s + r.views, 0),
    [viewsByDay, cutoff],
  );

  const isEmpty = topPosts.length === 0;

  return (
    <div className="space-y-4" id="analitica-editorial">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[13px] font-bold text-sp-admin-text">Editorial — Visitas a artículos</h2>
          <p className="text-[11px] text-sp-admin-muted">Visitas a news y blog · deduplicadas por sesión diaria</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-sp-admin-border bg-sp-admin-hover p-0.5">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => setWindow(w.value)}
                className={`h-6 px-2.5 rounded-md text-[10px] font-semibold transition-colors ${
                  window === w.value
                    ? 'bg-white shadow text-sp-admin-text'
                    : 'text-sp-admin-muted hover:text-sp-admin-text'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <Link href="/admin/analytics/news" className="text-[11px] text-sp-admin-accent hover:underline shrink-0">
            Ver completo →
          </Link>
        </div>
      </div>

      {/* KPI total */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-[2px]" style={{ background: '#8b3aad' }} />
          <div className="px-4 py-3">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">
              Visitas totales ({window === '7d' ? '7 días' : '30 días'})
            </p>
            <p className="text-[17px] font-bold tabular-nums mt-1" style={{ color: '#8b3aad' }}>
              {totalViews.toLocaleString('es-ES')}
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-[2px]" style={{ background: '#5b9bd5' }} />
          <div className="px-4 py-3">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">Artículos con visitas</p>
            <p className="text-[17px] font-bold tabular-nums mt-1" style={{ color: '#5b9bd5' }}>
              {topPosts.length.toLocaleString('es-ES')}
            </p>
          </div>
        </div>
      </div>

      {/* Top 5 */}
      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-8 text-center">
          <p className="text-[12px] text-sp-admin-muted">Sin visitas registradas aún.</p>
          <p className="text-[11px] text-sp-admin-muted/60 mt-1">
            Las visitas se registran automáticamente al leer un artículo de /news o /blog.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/40">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
              Top 5 artículos ({window === '7d' ? '7 días' : '30 días'})
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sp-admin-border">
                  {['Artículo', 'Tipo', 'Visitas', 'Únicos'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-sp-admin-border/40">
                {filteredTop.map((r) => (
                  <tr key={r.postId} className="hover:bg-sp-admin-hover transition-colors">
                    <td className="px-3 py-2 max-w-[240px]">
                      <Link
                        href={`/admin/analytics/news/${r.postId}`}
                        className="text-[11px] font-bold text-sp-admin-text hover:text-sp-admin-accent transition-colors truncate block"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                        r.vertical === 'news'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-orange-50 text-orange-600'
                      }`}>
                        {r.vertical}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[12px] tabular-nums font-bold text-sp-orange text-right">
                      {(window === '7d' ? r.views7d : r.views30d).toLocaleString('es-ES')}
                    </td>
                    <td className="px-3 py-2 text-[11px] tabular-nums text-sp-admin-muted text-right">
                      {r.uniqueVisitors.toLocaleString('es-ES')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
