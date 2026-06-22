'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { deleteContractAction } from '@/app/admin/(dashboard)/contratos/actions';
import type { GeneratedContractRow } from '@/lib/queries/generatedContracts';
import { CONTRACT_STATUSES } from '@/lib/queries/generatedContracts';

// ── Estilos ────────────────────────────────────────────────────────────

type StatusKey = 'draft' | 'sent' | 'signed' | 'archived';

const STATUS_STYLE: Record<StatusKey, string> = {
  draft:    'bg-slate-100  text-slate-600  border-slate-200',
  sent:     'bg-blue-50    text-blue-700   border-blue-200',
  signed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  archived: 'bg-gray-50    text-gray-500   border-gray-200',
};

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const cfg   = CONTRACT_STATUSES.find((s) => s.value === status);
  const style = STATUS_STYLE[status as StatusKey] ?? STATUS_STYLE.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${style}`}>
      {cfg?.label ?? status}
    </span>
  );
}

// ── Props ──────────────────────────────────────────────────────────────

type Props = {
  readonly contracts: readonly GeneratedContractRow[];
};

export function ContratosTable({ contracts }: Props): React.ReactElement {
  const router     = useRouter();
  const params     = useSearchParams();
  const [, startT] = useTransition();

  const filterStatus = params.get('status') ?? '';

  const filtered = filterStatus
    ? contracts.filter((c) => c.status === filterStatus)
    : contracts;

  function handleDelete(c: GeneratedContractRow): void {
    if (!confirm(`¿Eliminar el contrato "${c.title}"? Esta acción no se puede deshacer.`)) return;
    startT(async () => {
      await deleteContractAction(c.id);
      router.refresh();
    });
  }

  function setFilter(status: string): void {
    const url = new URL(window.location.href);
    if (status) url.searchParams.set('status', status);
    else url.searchParams.delete('status');
    router.push(url.pathname + url.search);
  }

  // ── KPIs rápidos ──────────────────────────────────────────────────────
  const counts: Record<string, number> = {};
  for (const c of contracts) { counts[c.status] = (counts[c.status] ?? 0) + 1; }

  return (
    <div className="space-y-4">
      {/* Filtros de estado */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
            filterStatus === '' ? 'bg-sp-admin-accent text-white border-transparent' : 'border-sp-admin-border text-sp-admin-muted hover:bg-sp-admin-hover'
          }`}
        >
          Todos ({contracts.length})
        </button>
        {CONTRACT_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
              filterStatus === s.value ? 'bg-sp-admin-accent text-white border-transparent' : 'border-sp-admin-border text-sp-admin-muted hover:bg-sp-admin-hover'
            }`}
          >
            {s.label} ({counts[s.value] ?? 0})
          </button>
        ))}
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-10 text-center">
          <p className="text-[14px] font-bold text-sp-admin-text mb-1">
            {filterStatus ? `Sin contratos en estado "${filterStatus}"` : 'Sin contratos todavía'}
          </p>
          <p className="text-[12px] text-sp-admin-muted mb-4">
            Crea tu primer contrato desde una plantilla.
          </p>
          <Link
            href="/admin/contratos/nuevo"
            className="inline-flex h-9 items-center gap-1.5 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors"
          >
            + Nuevo contrato
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-sp-admin-hover/30 border-b border-sp-admin-border">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">Título</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted hidden md:table-cell">Plantilla</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted hidden lg:table-cell">Talento</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted hidden lg:table-cell">Marca</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">Estado</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted hidden sm:table-cell">Fecha</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sp-admin-border/40">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-sp-admin-hover/10 transition-colors group">
                  <td className="px-4 py-3">
                    <Link href={`/admin/contratos/${c.id}`} className="font-semibold text-sp-admin-text hover:text-sp-admin-accent transition-colors">
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sp-admin-muted hidden md:table-cell">
                    {c.templateName ?? <span className="text-sp-admin-muted/40">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sp-admin-muted hidden lg:table-cell">
                    {c.talentName ?? <span className="text-sp-admin-muted/40">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sp-admin-muted hidden lg:table-cell">
                    {c.brandName ?? <span className="text-sp-admin-muted/40">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-sp-admin-muted hidden sm:table-cell whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {c.fileUrl && (
                        <a
                          href={c.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 px-2.5 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors inline-flex items-center"
                        >
                          PDF
                        </a>
                      )}
                      <Link
                        href={`/admin/contratos/${c.id}`}
                        className="h-7 px-2.5 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors inline-flex items-center"
                      >
                        Ver
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="h-7 px-2 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-50 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
