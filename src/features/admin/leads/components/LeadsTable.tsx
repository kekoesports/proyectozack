'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';

import type { LeadStatus, LeadWithAssignee } from '@/types';
import {
  assignLeadAction,
  updateLeadStatusAction,
} from '@/app/admin/(dashboard)/leads/actions';

import { STATUS_META, isLeadStatus, shortDate, typeMeta } from './leadMeta';

type StatusFilter = LeadStatus | 'all';
type TypeFilter = string;
type OwnerFilter = 'all' | 'unassigned' | 'mine';

export type StaffOption = { readonly id: string; readonly name: string };

type Props = {
  readonly leads: readonly LeadWithAssignee[];
  readonly staff: readonly StaffOption[];
  readonly currentUserId: string;
  readonly canWrite: boolean;
};

const INBOX_LABELS: Record<StatusFilter, string> = {
  nuevo: 'Entrada', interesante: 'Interesantes', contactado: 'Contactados', ganado: 'Ganados', descartado: 'Descartados', all: 'Todos',
};
const INBOXES: readonly StatusFilter[] = ['nuevo', 'interesante', 'contactado', 'ganado', 'descartado', 'all'];

function isOwnerFilter(v: string): v is OwnerFilter {
  return v === 'all' || v === 'unassigned' || v === 'mine';
}

export function LeadsTable({ leads, staff, currentUserId, canWrite }: Props): React.ReactElement {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('nuevo');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);

  const inboxCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      nuevo: 0, interesante: 0, contactado: 0, ganado: 0, descartado: 0, all: leads.length,
    };
    for (const lead of leads) counts[lead.status] += 1;
    return counts;
  }, [leads]);

  const types = useMemo(
    () => Array.from(new Set(leads.map((l) => l.type))).sort(),
    [leads],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (typeFilter !== 'all' && l.type !== typeFilter) return false;
      if (ownerFilter === 'unassigned' && l.assignedToId !== null) return false;
      if (ownerFilter === 'mine' && l.assignedToId !== currentUserId) return false;
      if (q && !`${l.name} ${l.email} ${l.company ?? ''} ${l.message}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [leads, search, statusFilter, typeFilter, ownerFilter, currentUserId]);

  const onStatusChange = (lead: LeadWithAssignee, raw: string): void => {
    if (!isLeadStatus(raw) || raw === lead.status) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await updateLeadStatusAction({ id: lead.id, status: raw });
        if (!result.ok) {
          setFeedback({ error: true, text: result.error });
          return;
        }
        setFeedback({ error: false, text: `Lead movido a ${INBOX_LABELS[raw]}.` });
      } catch {
        setFeedback({ error: true, text: 'No se pudo cambiar el estado. Inténtalo de nuevo.' });
      }
    });
  };

  const onAssignChange = (lead: LeadWithAssignee, raw: string): void => {
    if (raw === (lead.assignedToId ?? '')) return;
    startTransition(async () => {
      await assignLeadAction({ id: lead.id, assignedToId: raw });
    });
  };

  const resetFilters = (): void => {
    setSearch('');
    setTypeFilter('all');
    setOwnerFilter('all');
  };

  const filtersActive =
    search !== '' || typeFilter !== 'all' || ownerFilter !== 'all';

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-8 text-center text-sm text-sp-admin-muted">
        Todavía no hay leads. Las entradas del formulario público de contacto aparecen aquí
        automáticamente.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Bandejas de leads" className="flex gap-1 overflow-x-auto border-b border-sp-admin-border">
        {INBOXES.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={statusFilter === key}
            onClick={() => { setStatusFilter(key); setFeedback(null); }}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              statusFilter === key
                ? 'border-sp-orange text-sp-orange'
                : 'border-transparent text-sp-admin-muted hover:text-sp-admin-text'
            }`}
          >
            {INBOX_LABELS[key]}
            <span className="rounded bg-sp-admin-bg2 px-1.5 py-0.5 text-xs tabular-nums">{inboxCounts[key]}</span>
          </button>
        ))}
      </div>
      {feedback ? (
        <p role={feedback.error ? 'alert' : 'status'} className={`text-sm ${feedback.error ? 'text-red-400' : 'text-sp-admin-muted'}`}>
          {feedback.text}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          aria-label="Buscar leads"
          placeholder="Buscar por nombre, email, empresa o mensaje…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[240px] px-3 py-1.5 text-sm bg-sp-admin-card border border-sp-admin-border rounded text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:border-sp-admin-text/40"
        />
        <select
          aria-label="Tipo de lead"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-sp-admin-card border border-sp-admin-border rounded text-sp-admin-text"
        >
          <option value="all">Todos los tipos</option>
          {types.map((t) => (
            <option key={t} value={t}>{typeMeta(t).label}</option>
          ))}
        </select>
        <select
          aria-label="Responsable del lead"
          value={ownerFilter}
          onChange={(e) => { if (isOwnerFilter(e.target.value)) setOwnerFilter(e.target.value); }}
          className="px-3 py-1.5 text-sm bg-sp-admin-card border border-sp-admin-border rounded text-sp-admin-text"
        >
          <option value="all">Cualquier owner</option>
          <option value="unassigned">Sin asignar</option>
          <option value="mine">Míos</option>
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

      <div aria-live="polite" className="text-xs text-sp-admin-muted tabular-nums">
        {filtered.length} de {inboxCounts[statusFilter]} en {INBOX_LABELS[statusFilter]}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-8 text-center text-sm text-sp-admin-muted">
          {filtersActive
            ? 'Ningún lead coincide con estos filtros.'
            : statusFilter === 'nuevo'
              ? 'Entrada al día. Los leads atendidos siguen disponibles en sus pestañas.'
              : 'Todavía no hay leads en esta pestaña.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sp-admin-border bg-sp-admin-card">
          <table className="w-full text-sm">
            <thead className="bg-sp-admin-bg2 text-xs uppercase text-sp-admin-muted">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Fecha</th>
                <th className="text-left px-3 py-2 font-semibold">Tipo</th>
                <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                <th className="text-left px-3 py-2 font-semibold">Email</th>
                <th className="text-left px-3 py-2 font-semibold">Empresa</th>
                <th className="text-left px-3 py-2 font-semibold">Estado</th>
                <th className="text-left px-3 py-2 font-semibold">Asignado</th>
                <th className="text-left px-3 py-2 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const tm = typeMeta(l.type);
                return (
                  <tr key={l.id} className="border-t border-sp-admin-border/50 hover:bg-sp-admin-bg2/40">
                    <td className="px-3 py-2 align-top text-sp-admin-muted text-xs tabular-nums whitespace-nowrap">
                      {shortDate(l.createdAt)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className={`text-xs px-2 py-0.5 rounded border ${tm.color}`}>{tm.label}</span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Link href={`/admin/leads/${l.id}`} className="text-sp-admin-text hover:underline font-medium">
                        {l.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 align-top text-sp-admin-text break-all">{l.email}</td>
                    <td className="px-3 py-2 align-top text-sp-admin-text">{l.company ?? '—'}</td>
                    <td className="px-3 py-2 align-top">
                      {canWrite ? (
                        <select
                          aria-label={`Estado de ${l.name}`}
                          disabled={isPending}
                          value={l.status}
                          onChange={(e) => onStatusChange(l, e.target.value)}
                          className={`text-xs px-2 py-1 rounded border bg-transparent ${STATUS_META[l.status].color}`}
                        >
                          {Object.entries(STATUS_META).map(([k, { label }]) => (
                            <option key={k} value={k} className="bg-sp-admin-card text-sp-admin-text">{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_META[l.status].color}`}>
                          {STATUS_META[l.status].label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {canWrite ? (
                        <select
                          aria-label={`Responsable de ${l.name}`}
                          disabled={isPending}
                          value={l.assignedToId ?? ''}
                          onChange={(e) => onAssignChange(l, e.target.value)}
                          className="text-xs px-2 py-1 rounded border border-sp-admin-border bg-transparent text-sp-admin-text"
                        >
                          <option value="" className="bg-sp-admin-card">Sin asignar</option>
                          {staff.map((s) => (
                            <option key={s.id} value={s.id} className="bg-sp-admin-card">{s.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sp-admin-text">{l.assignedToName ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Link href={`/admin/leads/${l.id}`} className="text-xs text-sp-admin-muted hover:text-sp-admin-text hover:underline">
                        Ver ficha
                      </Link>
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
