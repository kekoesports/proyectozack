'use client';

import { useMemo, useState } from 'react';
import type { GiveawayClickRow, GiveawayHubViewRow } from '@/lib/queries/giveawayAnalytics';

type Window = '7d' | '30d' | 'all';

const WINDOWS: { value: Window; label: string }[] = [
  { value: '7d',  label: 'Últimos 7 días'  },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'all', label: 'Todo (90 días)'  },
];

function windowSince(w: Window): string | null {
  if (w === 'all') return null;
  const days = w === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

type GiveawayStat = {
  giveawayId: number;
  title:      string;
  brandName:  string;
  talentName: string;
  clicks:     number;
};

type Props = {
  readonly clicks: readonly GiveawayClickRow[];
  readonly views:  readonly GiveawayHubViewRow[];
};

export function GiveawayEventsSection({ clicks, views }: Props): React.ReactElement {
  const [window, setWindow] = useState<Window>('30d');

  const since = windowSince(window);

  const filteredClicks = useMemo(
    () => (since ? clicks.filter((r) => r.day >= since) : clicks),
    [clicks, since],
  );

  const filteredViews = useMemo(
    () => (since ? views.filter((r) => r.day >= since) : views),
    [views, since],
  );

  const byGiveaway = useMemo<GiveawayStat[]>(() => {
    const map = new Map<number, GiveawayStat>();
    for (const r of filteredClicks) {
      const id = r.giveawayId;
      const existing = map.get(id);
      if (existing) {
        existing.clicks += r.clicks;
      } else {
        map.set(id, {
          giveawayId: id,
          title:      r.title,
          brandName:  r.brandName,
          talentName: r.talentName,
          clicks:     r.clicks,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.clicks - a.clicks);
  }, [filteredClicks]);

  const totalClicks = byGiveaway.reduce((s, r) => s + r.clicks, 0);
  const totalViews  = filteredViews.reduce((s, r) => s + r.views, 0);

  const isEmpty = totalClicks === 0 && totalViews === 0;

  return (
    <div className="space-y-4" id="analitica-sorteos">
      {/* Header + selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[13px] font-bold text-sp-admin-text">Sorteos — Vistas y Clicks</h2>
          <p className="text-[11px] text-sp-admin-muted">Visitas al hub de sorteos y clicks en CTAs de participación</p>
        </div>
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
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Vistas del hub',   value: totalViews,  accent: '#5b9bd5' },
          { label: 'Clicks (CTAs)',    value: totalClicks, accent: '#f5632a' },
        ].map((k) => (
          <div key={k.label} className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-[2px]" style={{ background: k.accent }} />
            <div className="px-4 py-3">
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">{k.label}</p>
              <p className="text-[17px] font-bold tabular-nums mt-1" style={{ color: k.accent }}>
                {k.value.toLocaleString('es-ES')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-8 text-center">
          <p className="text-[12px] text-sp-admin-muted">Sin datos registrados en este período.</p>
          <p className="text-[11px] text-sp-admin-muted/60 mt-1">
            Las vistas y clicks se registran automáticamente desde /sorteos.
          </p>
        </div>
      ) : (
        byGiveaway.length > 0 && (
          <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/40">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
                Top sorteos por clicks
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sp-admin-border">
                    {['Sorteo', 'Marca', 'Creador', 'Clicks'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sp-admin-border/40">
                  {byGiveaway.slice(0, 20).map((r) => (
                    <tr key={r.giveawayId} className="hover:bg-sp-admin-hover transition-colors">
                      <td className="px-3 py-2 text-[11px] font-bold text-sp-admin-text truncate max-w-[200px]">{r.title}</td>
                      <td className="px-3 py-2 text-[11px] text-sp-admin-muted truncate max-w-[120px]">{r.brandName}</td>
                      <td className="px-3 py-2 text-[11px] text-sp-admin-text truncate max-w-[100px]">{r.talentName}</td>
                      <td className="px-3 py-2 text-[12px] tabular-nums font-bold text-sp-orange text-right">{r.clicks.toLocaleString('es-ES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
