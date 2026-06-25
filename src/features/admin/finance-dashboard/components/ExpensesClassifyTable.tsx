'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { InvoiceWithRelations } from '@/types';
import { EXPENSE_GROUP_LABELS, EXPENSE_SUBTYPE_LABELS, type ExpenseGroupValue, type ExpenseSubtypeValue } from '@/lib/schemas/invoice';
import { ExpenseClassifyInline } from './ExpenseClassifyInline';
import { BulkClassifyPanel } from './BulkClassifyPanel';

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

type Props = {
  readonly invoices: readonly InvoiceWithRelations[];
  readonly title: string;
  readonly showClassify?: boolean;
};

export function ExpensesClassifyTable({ invoices, title, showClassify = false }: Props): React.ReactElement {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === invoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(invoices.map((i) => i.id)));
    }
  }

  const selectedIds = Array.from(selected);

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-8 text-center text-sm text-sp-admin-muted">
        No hay facturas en este filtro.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-sp-admin-fg">{title}</h3>
        <span className="text-xs text-sp-admin-muted">{invoices.length} facturas</span>
      </div>

      {showClassify && (
        <BulkClassifyPanel
          selectedIds={selectedIds}
          onDone={() => setSelected(new Set())}
        />
      )}

      <div className="overflow-x-auto rounded-2xl border border-sp-admin-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sp-admin-border text-[11px] uppercase tracking-wider text-sp-admin-muted">
              {showClassify && (
                <th className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === invoices.length && invoices.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
              )}
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Concepto</th>
              <th className="px-3 py-2 text-left">Marca</th>
              <th className="px-3 py-2 text-right">Importe</th>
              <th className="px-3 py-2 text-left">Estado</th>
              {showClassify && <th className="px-3 py-2 text-left">Clasificación</th>}
              {!showClassify && <th className="px-3 py-2 text-left">Grupo / Subtipo</th>}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-sp-admin-border/50 hover:bg-sp-admin-hover/30 transition-colors">
                {showClassify && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(inv.id)}
                      onChange={() => toggleRow(inv.id)}
                      className="rounded"
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-sp-admin-muted whitespace-nowrap">
                  {inv.issueDate}
                </td>
                <td className="px-3 py-2 text-sp-admin-fg max-w-[220px] truncate">
                  <Link
                    href={`/admin/facturacion?id=${inv.id}`}
                    className="hover:text-sp-orange transition-colors"
                  >
                    {inv.concept}
                  </Link>
                </td>
                <td className="px-3 py-2 text-sp-admin-muted max-w-[120px] truncate">
                  {inv.brandName ?? inv.counterpartyName ?? '—'}
                </td>
                <td className="px-3 py-2 text-right font-medium text-sp-admin-fg whitespace-nowrap">
                  {EUR.format(Number(inv.totalAmount))}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={inv.status} />
                </td>
                {showClassify ? (
                  <td className="px-3 py-2">
                    <ExpenseClassifyInline
                      invoiceId={inv.id}
                      currentGroup={inv.expenseGroup as ExpenseGroupValue | null}
                      currentSubtype={inv.expenseSubtype as ExpenseSubtypeValue | null}
                    />
                  </td>
                ) : (
                  <td className="px-3 py-2 text-xs text-sp-admin-muted">
                    {inv.expenseGroup
                      ? (EXPENSE_GROUP_LABELS[inv.expenseGroup as ExpenseGroupValue] ?? inv.expenseGroup)
                      : <span className="text-amber-400">—</span>}
                    {inv.expenseSubtype && (
                      <span className="ml-1 opacity-60">
                        / {EXPENSE_SUBTYPE_LABELS[inv.expenseSubtype as ExpenseSubtypeValue] ?? inv.expenseSubtype}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const map: Record<string, string> = {
    cobrada: 'bg-emerald-500/15 text-emerald-400',
    pagada: 'bg-emerald-500/15 text-emerald-400',
    emitida: 'bg-blue-500/15 text-blue-400',
    pendiente: 'bg-amber-500/15 text-amber-400',
    no_pagada: 'bg-amber-500/15 text-amber-400',
    no_cobrada: 'bg-amber-500/15 text-amber-400',
    vencida: 'bg-red-500/15 text-red-400',
    borrador: 'bg-sp-admin-border/50 text-sp-admin-muted',
    anulada: 'bg-sp-admin-border/50 text-sp-admin-muted line-through',
  };
  const cls = map[status] ?? 'bg-sp-admin-border/50 text-sp-admin-muted';
  return (
    <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${cls}`}>
      {status}
    </span>
  );
}
