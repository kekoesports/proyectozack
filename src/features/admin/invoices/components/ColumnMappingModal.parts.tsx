'use client';

import type { MappableField } from '@/lib/parsers/common';

export type Source = 'xlsx' | 'csv';

export const FIELD_LABEL: Record<MappableField, string> = {
  issueDate: 'Fecha emisión',
  dueDate: 'Vencimiento',
  number: 'Nº factura',
  concept: 'Concepto',
  netAmount: 'Neto',
  totalAmount: 'Total',
  vatPct: 'IVA %',
  counterpartyName: 'Contraparte',
  issuerNif: 'NIF emisor',
  issuerName: 'Nombre emisor',
  category: 'Categoría',
};

export const INPUT =
  'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
export const LABEL = 'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';
export const BTN_PRIMARY =
  'px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer';
export const BTN_GHOST =
  'px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer';

export function matchesTemplate(
  headers: readonly string[],
  templateHeaders: readonly string[],
): number {
  const norm = (s: string): string => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const set = new Set(headers.map(norm).filter(Boolean));
  if (set.size === 0) return 0;
  let matches = 0;
  for (const h of templateHeaders) if (set.has(norm(h))) matches += 1;
  return matches / set.size;
}

// <input type="file"> re-attached into the form via a DataTransfer so the server
// action receives the File that was picked in the parent UploadCard.
export function HiddenFileInput({ file }: { readonly file: File }): React.ReactElement {
  const ref = (node: HTMLInputElement | null): void => {
    if (!node) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    node.files = dt.files;
  };
  return <input ref={ref} type="file" name="file" className="hidden" />;
}
