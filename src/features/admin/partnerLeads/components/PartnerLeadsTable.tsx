'use client';

import { useMemo, useState, useTransition } from 'react';

import {
  updatePartnerLeadNotesAction,
  updatePartnerLeadStatusAction,
} from '@/app/admin/(dashboard)/partner-leads/actions';
import type {
  PartnerLead,
  PartnerLeadCategory,
  PartnerLeadOutreachStatus,
  PartnerLeadRiskLevel,
} from '@/types';

const CATEGORY_LABELS: Record<PartnerLeadCategory, string> = {
  'case-opening': 'Apertura de cajas',
  'skin-marketplace': 'Marketplace de skins',
  'skin-trading': 'Trading de skins',
  'esports-betting': 'Apuestas esports',
  'gaming-adjacent': 'Gaming relacionado',
  other: 'Otro',
};

const RISK_META: Record<PartnerLeadRiskLevel, { readonly label: string; readonly color: string }> = {
  green: { label: 'Verde', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  amber: { label: 'Ámbar', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  red: { label: 'Rojo', color: 'border-red-500/40 bg-red-500/10 text-red-300' },
};

const STATUS_META: Record<PartnerLeadOutreachStatus, { readonly label: string; readonly color: string }> = {
  nuevo: { label: 'Nuevo', color: 'border-blue-500/40 text-blue-300' },
  revision: { label: 'En revisión', color: 'border-amber-500/40 text-amber-300' },
  aprobado: { label: 'Aprobado', color: 'border-emerald-500/40 text-emerald-300' },
  contactado: { label: 'Contactado', color: 'border-cyan-500/40 text-cyan-300' },
  negociando: { label: 'Negociando', color: 'border-purple-500/40 text-purple-300' },
  descartado: { label: 'Descartado', color: 'border-zinc-500/40 text-zinc-400' },
};

type RiskFilter = PartnerLeadRiskLevel | 'all';
type StatusFilter = PartnerLeadOutreachStatus | 'all';

function isRiskFilter(value: string): value is RiskFilter {
  return value === 'all' || value in RISK_META;
}

function isStatus(value: string): value is PartnerLeadOutreachStatus {
  return value in STATUS_META;
}

function isStatusFilter(value: string): value is StatusFilter {
  return value === 'all' || isStatus(value);
}

function date(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function PartnerLeadsTable({
  items,
  canWrite,
}: {
  readonly items: readonly PartnerLead[];
  readonly canWrite: boolean;
}): React.ReactElement {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (riskFilter !== 'all' && item.riskLevel !== riskFilter) return false;
      if (statusFilter !== 'all' && item.outreachStatus !== statusFilter) return false;
      if (query && !`${item.name} ${item.domain} ${item.companyName ?? ''} ${item.jurisdiction ?? ''}`.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [items, riskFilter, search, statusFilter]);

  const onStatusChange = (item: PartnerLead, value: string): void => {
    if (!isStatus(value) || value === item.outreachStatus) return;
    startTransition(async () => {
      await updatePartnerLeadStatusAction({ id: item.id, status: value });
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-8 text-center text-sm text-sp-admin-muted">
        Este informe no contiene leads. El radar conserva igualmente la ejecución y su aviso de Discord.
      </div>
    );
  }

  return (
    <section aria-labelledby="partner-leads-heading" className="space-y-4">
      <h2 id="partner-leads-heading" className="font-display text-lg font-black uppercase text-sp-admin-text">
        Leads comerciales
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Buscar por nombre, dominio, empresa o jurisdicción…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-[260px] flex-1 rounded border border-sp-admin-border bg-sp-admin-card px-3 py-1.5 text-sm text-sp-admin-text placeholder:text-sp-admin-muted"
        />
        <select
          value={riskFilter}
          onChange={(event) => { if (isRiskFilter(event.target.value)) setRiskFilter(event.target.value); }}
          className="rounded border border-sp-admin-border bg-sp-admin-card px-3 py-1.5 text-sm text-sp-admin-text"
        >
          <option value="all">Cualquier riesgo</option>
          {Object.entries(RISK_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => { if (isStatusFilter(event.target.value)) setStatusFilter(event.target.value); }}
          className="rounded border border-sp-admin-border bg-sp-admin-card px-3 py-1.5 text-sm text-sp-admin-text"
        >
          <option value="all">Cualquier estado</option>
          {Object.entries(STATUS_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select>
      </div>

      <p className="text-xs tabular-nums text-sp-admin-muted">{filtered.length} de {items.length}</p>

      <div className="overflow-x-auto rounded-lg border border-sp-admin-border bg-sp-admin-card">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="bg-sp-admin-bg2 text-xs uppercase text-sp-admin-muted">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Partner</th>
              <th className="px-3 py-2 text-left font-semibold">Encaje</th>
              <th className="px-3 py-2 text-left font-semibold">Riesgo</th>
              <th className="px-3 py-2 text-left font-semibold">España</th>
              <th className="px-3 py-2 text-left font-semibold">Contacto</th>
              <th className="px-3 py-2 text-left font-semibold">Pipeline</th>
              <th className="px-3 py-2 text-left font-semibold">Verificado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-t border-sp-admin-border/50 hover:bg-sp-admin-bg2/40">
                <td className="max-w-[260px] px-3 py-3 align-top">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sp-admin-text hover:underline">
                    {item.name}
                  </a>
                  <p className="text-xs text-sp-admin-muted">{item.domain}</p>
                  <p className="mt-1 text-xs text-sp-admin-muted">{CATEGORY_LABELS[item.category]} · {item.jurisdiction ?? 'Jurisdicción sin confirmar'}</p>
                  <details className="mt-2 text-xs text-sp-admin-muted">
                    <summary className="cursor-pointer text-sp-admin-accent">Ver diligencia y fuentes</summary>
                    <div className="mt-2 space-y-2 rounded border border-sp-admin-border bg-sp-admin-bg2 p-3">
                      <p>{item.summary}</p>
                      {item.companyEvidence ? <p><strong>Empresa:</strong> {item.companyEvidence}</p> : null}
                      {item.licenceEvidence ? <p><strong>Licencia:</strong> {item.licenceEvidence}</p> : null}
                      {item.riskFlags.length > 0 ? <p><strong>Alertas:</strong> {item.riskFlags.join(' · ')}</p> : null}
                      <ul className="space-y-1">
                        {item.reliabilityEvidence.map((evidence) => (
                          <li key={`${evidence.url}-${evidence.checkedAt}`}>
                            <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {evidence.label}
                            </a>
                            {' · '}{evidence.checkedAt.slice(0, 10)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                </td>
                <td className="max-w-[260px] px-3 py-3 align-top text-xs text-sp-admin-text">
                  {item.creatorFit}
                </td>
                <td className="px-3 py-3 align-top">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${RISK_META[item.riskLevel].color}`}>
                    {RISK_META[item.riskLevel].label} · {item.confidence}%
                  </span>
                  <p className="mt-2 text-xs text-sp-admin-muted">{item.recommendation === 'recommended' ? 'Recomendado' : item.recommendation === 'watch' ? 'Vigilar' : 'Descartar'}</p>
                </td>
                <td className="max-w-[240px] px-3 py-3 align-top text-xs text-sp-admin-muted">
                  <strong className="text-sp-admin-text">{item.spainStatus}</strong>
                  <p className="mt-1">{item.spainSuitability}</p>
                </td>
                <td className="px-3 py-3 align-top text-xs">
                  <div className="flex flex-col items-start gap-1.5">
                    {item.contactEmail ? <a href={`mailto:${item.contactEmail}`} className="text-sp-admin-accent hover:underline">Email</a> : null}
                    {item.contactUrl ? <a href={item.contactUrl} target="_blank" rel="noopener noreferrer" className="text-sp-admin-accent hover:underline">Contacto</a> : null}
                    {item.commercialProgramUrl ? <a href={item.commercialProgramUrl} target="_blank" rel="noopener noreferrer" className="text-sp-admin-accent hover:underline">Programa comercial</a> : null}
                    {!item.contactEmail && !item.contactUrl && !item.commercialProgramUrl ? <span className="text-sp-admin-muted">Sin contacto verificado</span> : null}
                  </div>
                </td>
                <td className="px-3 py-3 align-top">
                  {canWrite ? (
                    <select
                      value={item.outreachStatus}
                      onChange={(event) => onStatusChange(item, event.target.value)}
                      className={`rounded border bg-transparent px-2 py-1 text-xs ${STATUS_META[item.outreachStatus].color}`}
                    >
                      {Object.entries(STATUS_META).map(([key, meta]) => <option key={key} value={key} className="bg-sp-admin-card text-sp-admin-text">{meta.label}</option>)}
                    </select>
                  ) : (
                    <span className={`rounded border px-2 py-1 text-xs ${STATUS_META[item.outreachStatus].color}`}>{STATUS_META[item.outreachStatus].label}</span>
                  )}
                  {canWrite ? <NotesEditor item={item} /> : null}
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-xs tabular-nums text-sp-admin-muted">
                  {date(item.lastVerifiedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NotesEditor({ item }: { readonly item: PartnerLead }): React.ReactElement {
  const [notes, setNotes] = useState(item.notes ?? '');
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <details className="mt-2 min-w-[180px] text-xs">
      <summary className="cursor-pointer text-sp-admin-muted">Notas internas</summary>
      <textarea
        value={notes}
        maxLength={4_000}
        onChange={(event) => { setNotes(event.target.value); setSaved(false); }}
        className="mt-2 min-h-20 w-full rounded border border-sp-admin-border bg-sp-admin-bg2 p-2 text-sp-admin-text"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => {
          const result = await updatePartnerLeadNotesAction({ id: item.id, notes });
          setSaved(result.ok);
        })}
        className="mt-1 rounded bg-sp-admin-accent px-2 py-1 font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'Guardando…' : saved ? 'Guardado' : 'Guardar'}
      </button>
    </details>
  );
}
