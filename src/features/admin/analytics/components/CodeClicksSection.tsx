'use client';

import { useMemo, useState } from 'react';
import type { CodeClickRow } from '@/lib/queries/codeAnalytics';

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

type CodeStat = {
  codeId: number;
  code: string;
  brandName: string;
  talentId: number;
  talentName: string;
  copies: number;
  ctas: number;
  total: number;
};

type TalentStat = {
  talentId: number;
  talentName: string;
  copies: number;
  ctas: number;
  total: number;
  activeCodes: number;
};

type SortKey = 'total' | 'copies' | 'ctas';

export function CodeClicksSection({ rows }: { readonly rows: readonly CodeClickRow[] }): React.ReactElement {
  const [window, setWindow] = useState<Window>('30d');
  const [sortKey, setSortKey] = useState<SortKey>('total');

  const since = windowSince(window);

  const filtered = useMemo(
    () => (since ? rows.filter((r) => r.day >= since) : rows),
    [rows, since],
  );

  const byCodes = useMemo<CodeStat[]>(() => {
    const map = new Map<number, CodeStat>();
    for (const r of filtered) {
      const existing = map.get(r.codeId);
      if (existing) {
        existing.copies += r.copies;
        existing.ctas   += r.ctas;
        existing.total  += r.copies + r.ctas;
      } else {
        map.set(r.codeId, {
          codeId: r.codeId, code: r.code,
          brandName: r.brandName, talentId: r.talentId, talentName: r.talentName,
          copies: r.copies, ctas: r.ctas, total: r.copies + r.ctas,
        });
      }
    }
    return [...map.values()].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [filtered, sortKey]);

  const byTalent = useMemo<TalentStat[]>(() => {
    const map = new Map<number, TalentStat>();
    for (const r of byCodes) {
      const existing = map.get(r.talentId);
      if (existing) {
        existing.copies += r.copies;
        existing.ctas   += r.ctas;
        existing.total  += r.total;
        existing.activeCodes += 1;
      } else {
        map.set(r.talentId, {
          talentId: r.talentId, talentName: r.talentName,
          copies: r.copies, ctas: r.ctas, total: r.total, activeCodes: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [byCodes]);

  const totals = useMemo(() => ({
    copies: byCodes.reduce((s, r) => s + r.copies, 0),
    ctas:   byCodes.reduce((s, r) => s + r.ctas,   0),
    total:  byCodes.reduce((s, r) => s + r.total,   0),
  }), [byCodes]);

  const isEmpty = totals.total === 0;

  return (
    <div className="space-y-4" id="analitica-codigos">
      {/* Header + selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[13px] font-bold text-sp-admin-text">Clicks en códigos</h2>
          <p className="text-[11px] text-sp-admin-muted">Copias y CTAs registrados por código de creador</p>
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
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total clicks', value: totals.total,  accent: '#f5632a' },
          { label: 'Copias',       value: totals.copies, accent: '#5b9bd5' },
          { label: 'CTAs',         value: totals.ctas,   accent: '#8b3aad' },
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
          <p className="text-[12px] text-sp-admin-muted">Sin clicks registrados en este período.</p>
          <p className="text-[11px] text-sp-admin-muted/60 mt-1">
            Los clicks se registran automáticamente cuando un usuario copia un código o pulsa el CTA en /giveaways.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 items-start">
          {/* Tabla top códigos */}
          <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/40 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
                Top códigos
              </p>
              <div className="flex items-center gap-1">
                {(['total', 'copies', 'ctas'] as SortKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSortKey(k)}
                    className={`h-5 px-2 rounded text-[9px] font-semibold transition-colors ${
                      sortKey === k
                        ? 'bg-sp-admin-accent text-white'
                        : 'text-sp-admin-muted hover:text-sp-admin-text'
                    }`}
                  >
                    {k === 'total' ? 'Total' : k === 'copies' ? 'Copias' : 'CTAs'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sp-admin-border">
                    {['Código', 'Marca', 'Creador', 'Copias', 'CTAs', 'Total'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sp-admin-border/40">
                  {byCodes.slice(0, 20).map((r) => (
                    <tr key={r.codeId} className="hover:bg-sp-admin-hover transition-colors">
                      <td className="px-3 py-2 font-mono text-[11px] font-bold text-sp-admin-text">{r.code}</td>
                      <td className="px-3 py-2 text-[11px] text-sp-admin-muted truncate max-w-[100px]">{r.brandName}</td>
                      <td className="px-3 py-2 text-[11px] text-sp-admin-text truncate max-w-[100px]">{r.talentName}</td>
                      <td className="px-3 py-2 text-[11px] tabular-nums text-sp-admin-muted text-right">{r.copies.toLocaleString('es-ES')}</td>
                      <td className="px-3 py-2 text-[11px] tabular-nums text-sp-admin-muted text-right">{r.ctas.toLocaleString('es-ES')}</td>
                      <td className="px-3 py-2 text-[12px] tabular-nums font-bold text-sp-orange text-right">{r.total.toLocaleString('es-ES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla por creador */}
          <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/40">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">Por creador</p>
            </div>
            <div className="divide-y divide-sp-admin-border/40">
              {byTalent.map((t, i) => (
                <div key={t.talentId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-sp-admin-hover transition-colors">
                  <span className="text-[10px] font-bold text-sp-admin-muted/50 w-4 shrink-0 tabular-nums text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-sp-admin-text truncate">{t.talentName}</p>
                    <p className="text-[9px] text-sp-admin-muted">
                      {t.activeCodes} {t.activeCodes === 1 ? 'código' : 'códigos'} · {t.copies} cop. · {t.ctas} CTA
                    </p>
                  </div>
                  <span className="text-[13px] font-bold tabular-nums text-sp-orange shrink-0">
                    {t.total.toLocaleString('es-ES')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
