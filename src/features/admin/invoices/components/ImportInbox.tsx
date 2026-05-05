'use client';

import { useState, useTransition } from 'react';
import type { InvoiceImportWithDraft } from '@/types';
import type { ImportTemplate } from '@/lib/queries/invoiceImportTemplates';
import { deleteImportAction, clearHistoryAction } from '@/app/admin/(dashboard)/facturacion/import/import-actions';
import {
  type BrandOption,
  type TalentOption,
  STATUS_LABEL,
  STATUS_STYLE,
  formatDateTime,
  EmptyState,
  UploadCard,
  PendingRow,
} from './ImportInbox.parts';

type ImportInboxProps = {
  readonly pending: readonly InvoiceImportWithDraft[];
  readonly reviewed: readonly InvoiceImportWithDraft[];
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly categories: readonly string[];
  readonly templates: readonly ImportTemplate[];
};

/**
 * Inbox del flujo de import de facturas: subida, mapeo de columnas, validación y commit a la base de datos.
 *
 * @kind client
 * @feature admin/invoices
 * @route /admin/facturacion/import
 */
export function ImportInbox({
  pending,
  reviewed,
  brands,
  talents,
  categories,
  templates,
}: ImportInboxProps): React.ReactElement {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: number): void => {
    startTransition(async () => { await deleteImportAction(id); });
  };

  const handleClearAll = (): void => {
    if (!confirm('¿Eliminar todo el historial de imports rechazados?')) return;
    startTransition(async () => { await clearHistoryAction(); });
  };

  return (
    <div className="space-y-8">
      <UploadCard templates={templates} />

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-xl font-black uppercase text-sp-admin-text">
            Pendientes de revisar
          </h2>
          <span className="text-xs text-sp-admin-muted">{pending.length} en cola</span>
        </div>
        {pending.length === 0 ? (
          <EmptyState message="Sin archivos pendientes. Sube uno arriba para empezar." />
        ) : (
          <div className="space-y-3">
            {pending.map((imp) => (
              <PendingRow
                key={imp.id}
                imp={imp}
                brands={brands}
                talents={talents}
                categories={categories}
                isOpen={expandedId === imp.id}
                onToggle={() => setExpandedId(expandedId === imp.id ? null : imp.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-xl font-black uppercase text-sp-admin-text">
            Histórico reciente
          </h2>
          {reviewed.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isPending}
              className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
            >
              Limpiar historial
            </button>
          )}
        </div>
        {reviewed.length === 0 ? (
          <EmptyState message="Todavía no se ha revisado ningún import." />
        ) : (
          <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Archivo</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Origen</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Revisado</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Factura</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {reviewed.map((imp) => (
                  <tr key={imp.id} className="border-b border-sp-admin-border/50 last:border-0 group">
                    <td className="px-4 py-3 text-sp-admin-text">{imp.sourceFilename}</td>
                    <td className="px-4 py-3 text-sp-admin-muted font-mono text-xs">{imp.sourceType}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLE[imp.status]}`}>
                        {STATUS_LABEL[imp.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-sp-admin-muted">{formatDateTime(imp.reviewedAt)}</td>
                    <td className="px-4 py-3 text-xs">
                      {imp.invoiceId ? (
                        <span className="text-sp-admin-accent">#{imp.invoiceId}</span>
                      ) : (
                        <span className="text-sp-admin-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(imp.id)}
                        disabled={isPending}
                        aria-label="Eliminar"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 disabled:opacity-30"
                      >
                        <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
