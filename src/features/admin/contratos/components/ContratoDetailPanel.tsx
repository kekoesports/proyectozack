'use client';

import { useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateContractStatusAction,
  deleteContractAction,
} from '@/app/admin/(dashboard)/contratos/actions';
import { CONTRACT_STATUSES } from '@/lib/contractVariables';
import type { GeneratedContractDetail } from '@/lib/queries/generatedContracts';

// ── Estilos ────────────────────────────────────────────────────────────

const I   = 'w-full rounded-lg border border-sp-admin-border bg-white px-3 py-2 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const LB  = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';
const BP  = 'h-9 px-5 rounded-lg bg-sp-admin-accent text-white text-[12px] font-bold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors';
const BG  = 'h-9 px-4 rounded-lg border border-sp-admin-border text-[12px] text-sp-admin-muted hover:bg-sp-admin-hover hover:text-sp-admin-text transition-colors';
const BR  = 'h-9 px-4 rounded-lg border border-red-200 text-[12px] text-red-500 hover:bg-red-50 transition-colors';

type StatusKey = 'draft' | 'sent' | 'signed' | 'archived';
const STATUS_STYLE: Record<StatusKey, string> = {
  draft:    'bg-slate-100  text-slate-600  border-slate-200',
  sent:     'bg-blue-50    text-blue-700   border-blue-200',
  signed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  archived: 'bg-gray-50    text-gray-500   border-gray-200',
};

// ── Props ──────────────────────────────────────────────────────────────

type Props = { readonly contract: GeneratedContractDetail };

// ── Componente ─────────────────────────────────────────────────────────

export function ContratoDetailPanel({ contract }: Props): React.ReactElement {
  const router     = useRouter();
  const [, startT] = useTransition();
  const [state, formAction, isPending] = useActionState(updateContractStatusAction, {});

  const statusStyle = STATUS_STYLE[contract.status as StatusKey] ?? STATUS_STYLE.draft;
  const statusLabel = CONTRACT_STATUSES.find((s) => s.value === contract.status)?.label ?? contract.status;

  function handleDelete(): void {
    if (!confirm(`¿Eliminar el contrato "${contract.title}"? Esta acción no se puede deshacer.`)) return;
    startT(async () => {
      await deleteContractAction(contract.id);
      router.push('/admin/contratos');
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusStyle}`}>
              {statusLabel}
            </span>
            {contract.fileName && (
              <a
                href={contract.fileUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-sp-admin-accent hover:underline"
              >
                ↓ Descargar PDF
              </a>
            )}
          </div>
          <h1 className="text-[22px] font-bold text-sp-admin-text leading-tight">{contract.title}</h1>
          <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-sp-admin-muted">
            {contract.templateName && <span>Plantilla: <strong className="text-sp-admin-text">{contract.templateName}</strong></span>}
            {contract.talentName   && <span>Talento: <strong className="text-sp-admin-text">{contract.talentName}</strong></span>}
            {contract.brandName    && <span>Marca: <strong className="text-sp-admin-text">{contract.brandName}</strong></span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleDelete} className={BR}>
            Eliminar
          </button>
        </div>
      </div>

      {/* Grid de info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Creado',   value: new Date(contract.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) },
          { label: 'Enviado',  value: contract.sentAt   ? new Date(contract.sentAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—' },
          { label: 'Firmado',  value: contract.signedAt ? new Date(contract.signedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—' },
          { label: 'Archivo',  value: contract.fileName ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-sp-admin-muted">{label}</p>
            <p className="text-[12px] font-semibold text-sp-admin-text mt-0.5 truncate" title={value}>{value}</p>
          </div>
        ))}
      </div>

      {/* Actualizar estado */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5">
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-sp-admin-muted mb-3">Actualizar estado</h2>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={contract.id} />
          <div className="flex flex-wrap gap-2">
            {CONTRACT_STATUSES.map((s) => (
              <button
                key={s.value}
                type="submit"
                name="status"
                value={s.value}
                disabled={isPending || contract.status === s.value}
                className={`h-8 px-4 rounded-full text-[11px] font-bold border transition-colors disabled:cursor-not-allowed ${
                  contract.status === s.value
                    ? (STATUS_STYLE[s.value as StatusKey] ?? STATUS_STYLE.draft) + ' border opacity-100'
                    : 'border-sp-admin-border text-sp-admin-muted hover:bg-sp-admin-hover'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {state.error && <p className="text-[12px] text-red-500">{state.error}</p>}
          {state.success && <p className="text-[12px] text-emerald-600">Estado actualizado</p>}
        </form>
      </div>

      {/* Notas */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5">
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-sp-admin-muted mb-3">Notas internas</h2>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id"     value={contract.id} />
          <input type="hidden" name="status" value={contract.status} />
          <div>
            <label className={LB}>Notas (solo internas)</label>
            <textarea
              name="notes"
              defaultValue={contract.notes ?? ''}
              rows={4}
              placeholder="Observaciones internas, condiciones especiales, historial de negociación…"
              className={`${I} resize-y`}
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isPending} className={BP}>
              {isPending ? 'Guardando…' : 'Guardar notas'}
            </button>
          </div>
        </form>
      </div>

      {/* Contenido del contrato */}
      <details className="rounded-xl border border-sp-admin-border overflow-hidden">
        <summary className="px-4 py-2.5 text-[11px] font-semibold text-sp-admin-muted cursor-pointer hover:bg-sp-admin-hover/30 select-none bg-sp-admin-hover/20">
          Ver contenido del contrato
        </summary>
        <pre className="px-5 py-4 text-[11px] font-mono text-sp-admin-text whitespace-pre-wrap leading-relaxed bg-sp-admin-hover/10 max-h-[500px] overflow-y-auto">
          {contract.content}
        </pre>
      </details>

      {/* Variables usadas */}
      {contract.varsJson && (
        <details className="rounded-xl border border-sp-admin-border overflow-hidden">
          <summary className="px-4 py-2.5 text-[11px] font-semibold text-sp-admin-muted cursor-pointer hover:bg-sp-admin-hover/30 select-none bg-sp-admin-hover/20">
            Variables usadas en la generación
          </summary>
          <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(JSON.parse(contract.varsJson) as Record<string, string>).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-sp-admin-hover/30 px-2.5 py-1.5">
                <p className="text-[9px] font-mono font-bold text-sp-admin-accent">{`{{${k}}}`}</p>
                <p className="text-[11px] text-sp-admin-text truncate" title={v}>{v}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Footer */}
      <div className="flex justify-start pt-2 border-t border-sp-admin-border/60">
        <button type="button" onClick={() => router.push('/admin/contratos')} className={BG}>
          ← Volver a contratos
        </button>
      </div>
    </div>
  );
}
