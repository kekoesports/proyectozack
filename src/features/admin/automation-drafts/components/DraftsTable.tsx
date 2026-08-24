'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';

import {
  approveDraftAction,
  rejectDraftAction,
} from '@/app/admin/(dashboard)/automation-drafts/actions';
import type { AutomationDealDraftListItem } from '@/lib/queries/automationDealDrafts';

import {
  DRAFT_STATUSES,
  isActionable,
  shortDateTime,
  sourceMeta,
  statusMeta,
} from './draftMeta';

type StatusFilter = string;

type Props = {
  readonly drafts: readonly AutomationDealDraftListItem[];
  readonly canWrite: boolean;
};

export function DraftsTable({ drafts, canWrite }: Props): React.ReactElement {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const sources = useMemo(
    () => Array.from(new Set(drafts.map((d) => d.source))).sort(),
    [drafts],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drafts.filter((d) => {
      // 'pending' agrupa lo que aún requiere una decisión humana — es la vista por defecto.
      if (statusFilter === 'pending' && !isActionable(d.status)) return false;
      if (statusFilter !== 'pending' && statusFilter !== 'all' && d.status !== statusFilter) {
        return false;
      }
      if (sourceFilter !== 'all' && d.source !== sourceFilter) return false;
      if (q) {
        const haystack = `${d.dealName ?? ''} ${d.rawText} ${d.externalId} ${d.sourceUserId ?? ''}`;
        if (!haystack.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [drafts, search, statusFilter, sourceFilter]);

  const filtersActive = search !== '' || statusFilter !== 'pending' || sourceFilter !== 'all';

  const resetFilters = (): void => {
    setSearch('');
    setStatusFilter('pending');
    setSourceFilter('all');
  };

  const run = (
    id: number,
    action: typeof approveDraftAction | typeof rejectDraftAction,
  ): void => {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await action({ id });
      if (!res.ok) setError(res.error);
      setPendingId(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por trato, mensaje original o id externo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[240px] px-3 py-1.5 text-sm bg-sp-admin-card border border-sp-admin-border rounded text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:border-sp-admin-text/40"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-sp-admin-card border border-sp-admin-border rounded text-sp-admin-text"
        >
          <option value="pending">Pendientes de revisar</option>
          <option value="all">Todos los estados</option>
          {DRAFT_STATUSES.map((s) => (
            <option key={s} value={s}>{statusMeta(s).label}</option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-sp-admin-card border border-sp-admin-border rounded text-sp-admin-text"
        >
          <option value="all">Cualquier origen</option>
          {sources.map((s) => (
            <option key={s} value={s}>{sourceMeta(s).label}</option>
          ))}
        </select>
        {filtersActive ? (
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-1.5 text-sm rounded border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="text-xs text-sp-admin-muted tabular-nums">
        {filtered.length} de {drafts.length}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-8 text-center text-sm text-sp-admin-muted">
          {drafts.length === 0
            ? 'Todavía no ha entrado ningún borrador. Los tratos que lleguen por Discord aparecerán aquí para su revisión.'
            : 'Ningún borrador coincide con estos filtros.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sp-admin-border bg-sp-admin-card">
          <table className="w-full text-sm">
            <thead className="bg-sp-admin-bg2 text-xs uppercase text-sp-admin-muted">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Entrada</th>
                <th className="text-left px-3 py-2 font-semibold">Origen</th>
                <th className="text-left px-3 py-2 font-semibold">Trato propuesto</th>
                <th className="text-left px-3 py-2 font-semibold">Estado</th>
                <th className="text-left px-3 py-2 font-semibold">Faltan</th>
                <th className="text-left px-3 py-2 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const sm = statusMeta(d.status);
                const src = sourceMeta(d.source);
                const missing = Array.from(new Set(d.validationIssues.map((issue) => issue.label)));
                const busy = pendingId === d.id;
                return (
                  <tr key={d.id} className="border-t border-sp-admin-border/50 hover:bg-sp-admin-bg2/40">
                    <td className="px-3 py-2 align-top text-sp-admin-muted text-xs tabular-nums whitespace-nowrap">
                      {shortDateTime(d.createdAt)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className={`text-xs px-2 py-0.5 rounded border ${src.color}`}>{src.label}</span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Link
                        href={`/admin/automation-drafts/${d.id}`}
                        className="text-sp-admin-text hover:underline font-medium"
                      >
                        {d.dealName ?? `Borrador #${d.id}`}
                      </Link>
                      {d.campaignId ? (
                        <div className="text-xs text-sp-admin-muted mt-0.5">
                          →{' '}
                          <Link href={`/admin/campanas/${d.campaignId}`} className="hover:underline">
                            {d.campaignName ?? `Trato #${d.campaignId}`}
                          </Link>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className={`text-xs px-2 py-0.5 rounded border ${sm.color}`}>{sm.label}</span>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-sp-admin-muted">
                      {missing.length > 0 ? missing.join(', ') : '—'}
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      {canWrite && isActionable(d.status) ? (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={busy || missing.length > 0}
                            onClick={() => run(d.id, approveDraftAction)}
                            title={
                              missing.length > 0
                                ? 'Faltan datos obligatorios para poder aprobarlo'
                                : 'Crear el trato en el CRM'
                            }
                            className="text-xs px-2 py-1 rounded border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(d.id, rejectDraftAction)}
                            className="text-xs px-2 py-1 rounded border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text disabled:opacity-40"
                          >
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-sp-admin-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
