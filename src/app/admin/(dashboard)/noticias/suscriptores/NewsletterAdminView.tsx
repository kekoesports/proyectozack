'use client';

import { useState } from 'react';
import type { NewsletterSubscriber } from '@/db/schema/newsletterSubscribers';

type Stats = { total: number; totalMarketing: number; last30: number };

type Props = {
  readonly subscribers: readonly NewsletterSubscriber[];
  readonly stats:       Stats;
};

function fmt(d: Date | string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function exportCsv(rows: readonly NewsletterSubscriber[]) {
  const header = 'email,status,newsletter,marketing,version,fecha_alta,fecha_baja,source';
  const lines = rows.map((r) =>
    [
      r.email,
      r.status,
      r.consentNewsletter ? 'sí' : 'no',
      r.consentMarketing  ? 'sí' : 'no',
      r.consentVersion,
      r.subscribedAt  ? new Date(r.subscribedAt).toISOString()  : '',
      r.unsubscribedAt ? new Date(r.unsubscribedAt).toISOString() : '',
      r.source,
    ].join(',')
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `suscriptores-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function NewsletterAdminView({ subscribers, stats }: Props) {
  const [filter, setFilter] = useState<'all' | 'newsletter' | 'marketing' | 'unsubscribed'>('all');
  const [search, setSearch] = useState('');

  const filtered = subscribers.filter((s) => {
    if (filter === 'marketing'   && !s.consentMarketing)         return false;
    if (filter === 'unsubscribed' && s.status !== 'unsubscribed') return false;
    if (filter === 'newsletter'  && s.status !== 'active')        return false;
    if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text">Suscriptores</h1>
          <p className="text-[12px] text-sp-admin-muted mt-1">Newsletter de SocialPro News</p>
        </div>
        <button
          onClick={() => exportCsv(filtered)}
          className="h-8 px-4 rounded-lg text-[12px] font-semibold border border-sp-admin-border text-sp-admin-muted hover:border-sp-admin-accent hover:text-sp-admin-accent transition-colors"
        >
          Exportar CSV ({filtered.length})
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Suscriptores activos', value: stats.total,          accent: '#16a34a' },
          { label: 'Opt-in comercial',     value: stats.totalMarketing, accent: '#f59e0b' },
          { label: 'Últimos 30 días',      value: stats.last30,         accent: '#8b3aad' },
        ].map((k) => (
          <div key={k.label} className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
            <div className="h-[2px]" style={{ background: k.accent }} />
            <div className="px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-sp-admin-muted">{k.label}</p>
              <p className="text-[22px] font-bold tabular-nums mt-1" style={{ color: k.accent }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {([
          { v: 'all',          label: 'Todos' },
          { v: 'newsletter',   label: 'Newsletter activo' },
          { v: 'marketing',    label: 'Opt-in comercial' },
          { v: 'unsubscribed', label: 'Baja' },
        ] as const).map(({ v, label }) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={[
              'h-7 px-3 rounded-full text-[11px] font-semibold border transition-colors',
              filter === v
                ? 'bg-sp-admin-accent text-white border-sp-admin-accent'
                : 'border-sp-admin-border text-sp-admin-muted hover:border-sp-admin-accent hover:text-sp-admin-accent',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
        <input
          type="search"
          placeholder="Buscar email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 rounded-full border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent ml-auto"
        />
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sp-admin-border bg-sp-admin-hover">
              {['Email', 'Newsletter', 'Comercial', 'Fuente', 'Fecha alta', 'Estado'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-sp-admin-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[12px] text-sp-admin-muted">
                  Sin resultados
                </td>
              </tr>
            ) : filtered.map((s) => (
              <tr key={s.id} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
                <td className="px-4 py-3 text-[13px] font-medium text-sp-admin-text">{s.email}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">✓</span>
                </td>
                <td className="px-4 py-3">
                  {s.consentMarketing
                    ? <span className="text-[10px] font-bold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">✓ Sí</span>
                    : <span className="text-[10px] text-sp-admin-muted">No</span>}
                </td>
                <td className="px-4 py-3 text-[11px] text-sp-admin-muted">{s.source}</td>
                <td className="px-4 py-3 text-[11px] text-sp-admin-muted whitespace-nowrap">{fmt(s.subscribedAt)}</td>
                <td className="px-4 py-3">
                  {s.status === 'active'
                    ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">Activo</span>
                    : <span className="text-[10px] font-bold text-sp-admin-muted bg-sp-admin-hover rounded-full px-2 py-0.5">Baja</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
