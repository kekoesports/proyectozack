'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { CreatorReviewDecision, CreatorReviewSourceType } from '@/lib/schemas/creator-outreach';

export type CreatorApplicationListItem = {
  readonly sourceType: CreatorReviewSourceType;
  readonly sourceId: number;
  readonly createdAt: string;
  readonly name: string;
  readonly email: string;
  readonly platform: string;
  readonly handle: string;
  readonly contentCategory: string | null;
  readonly followers: string | null;
  readonly averageAudience: string | null;
  readonly outreachStatus: string;
  readonly reviewDecision: CreatorReviewDecision | null;
};

const DECISION_META = {
  green: { label: 'Viable', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  yellow: { label: 'Revisar', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  red: { label: 'No encaja', color: 'border-red-500/40 bg-red-500/10 text-red-300' },
} as const;

function isDecisionFilter(value: string): value is 'all' | CreatorReviewDecision {
  return ['all', 'green', 'yellow', 'red'].includes(value);
}

function isStatusFilter(value: string): value is 'all' | 'new' | 'pending' | 'contacted' | 'discarded' {
  return ['all', 'new', 'pending', 'contacted', 'discarded'].includes(value);
}

function pipelineLabel(status: string): string {
  if (status === 'not_contacted') return 'Nueva';
  if (status === 'draft') return 'Pendiente';
  if (status === 'not_interested') return 'Descartada';
  if (['sent', 'delivered', 'replied', 'interested', 'needs_info', 'no_response'].includes(status)) return 'Contactada';
  return status;
}

export function CreatorApplicationsTable({ items }: { readonly items: readonly CreatorApplicationListItem[] }): React.ReactElement {
  const [search, setSearch] = useState('');
  const [decision, setDecision] = useState<'all' | CreatorReviewDecision>('all');
  const [status, setStatus] = useState<'all' | 'new' | 'pending' | 'contacted' | 'discarded'>('all');

  const filtered = useMemo(() => items.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [item.name, item.email, item.platform, item.handle, item.contentCategory ?? '']
      .some((value) => value.toLowerCase().includes(term));
    const matchesDecision = decision === 'all' || item.reviewDecision === decision;
    const category = item.outreachStatus === 'not_contacted' ? 'new'
      : item.outreachStatus === 'draft' ? 'pending'
        : item.outreachStatus === 'not_interested' ? 'discarded'
          : 'contacted';
    return matchesSearch && matchesDecision && (status === 'all' || status === category);
  }), [decision, items, search, status]);

  return (
    <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-sp-admin-border p-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar nombre, email, canal o juego…"
          className="min-w-[240px] flex-1 rounded border border-sp-admin-border bg-sp-admin-bg2 px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted"
        />
        <select value={decision} onChange={(event) => {
          if (isDecisionFilter(event.target.value)) setDecision(event.target.value);
        }} className="rounded border border-sp-admin-border bg-sp-admin-bg2 px-3 py-2 text-sm text-sp-admin-text">
          <option value="all">Todos los semáforos</option>
          <option value="green">🟢 Viables</option>
          <option value="yellow">🟡 Revisar</option>
          <option value="red">🔴 No encajan</option>
        </select>
        <select value={status} onChange={(event) => {
          if (isStatusFilter(event.target.value)) setStatus(event.target.value);
        }} className="rounded border border-sp-admin-border bg-sp-admin-bg2 px-3 py-2 text-sm text-sp-admin-text">
          <option value="all">Todos los estados</option>
          <option value="new">Nuevas</option>
          <option value="pending">Pendientes</option>
          <option value="contacted">Contactadas</option>
          <option value="discarded">Descartadas</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-sp-admin-border text-[11px] uppercase tracking-wide text-sp-admin-muted">
            <tr>
              <th className="px-4 py-3">Recibida</th>
              <th className="px-4 py-3">Creador</th>
              <th className="px-4 py-3">Red / canal</th>
              <th className="px-4 py-3">Contenido</th>
              <th className="px-4 py-3">Audiencia declarada</th>
              <th className="px-4 py-3">Semáforo</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sp-admin-border/70">
            {filtered.map((item) => {
              const meta = item.reviewDecision ? DECISION_META[item.reviewDecision] : null;
              return (
                <tr key={`${item.sourceType}:${item.sourceId}`} className="hover:bg-sp-admin-hover/60">
                  <td className="px-4 py-3 text-xs text-sp-admin-muted tabular-nums">{new Date(item.createdAt).toLocaleDateString('es-ES')}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/candidaturas/${item.sourceType}/${item.sourceId}`} prefetch={false} className="font-semibold text-sp-admin-text hover:underline">{item.name}</Link>
                    <p className="text-xs text-sp-admin-muted">{item.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sp-admin-text"><p>{item.platform || '—'}</p><p className="max-w-[220px] truncate text-xs text-sp-admin-muted">{item.handle || '—'}</p></td>
                  <td className="px-4 py-3 text-sp-admin-text">{item.contentCategory || '—'}</td>
                  <td className="px-4 py-3 text-sp-admin-text"><p>{item.followers || '—'} seguidores</p><p className="text-xs text-sp-admin-muted">Media: {item.averageAudience || '—'}</p></td>
                  <td className="px-4 py-3">{meta ? <span className={`rounded border px-2 py-1 text-xs ${meta.color}`}>{meta.label}</span> : <span className="text-xs text-sp-admin-muted">Sin revisar</span>}</td>
                  <td className="px-4 py-3 text-xs text-sp-admin-muted">{pipelineLabel(item.outreachStatus)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? <p className="p-6 text-center text-sm text-sp-admin-muted">No hay candidaturas con esos filtros.</p> : null}
    </section>
  );
}
