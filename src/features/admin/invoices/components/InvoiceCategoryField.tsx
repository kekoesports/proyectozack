'use client';

import { useState } from 'react';

import {
  INVOICE_AI_TOOLS,
  INVOICE_AI_TOOL_LABELS,
  looksLikeAiCategory,
} from '@/lib/schemas/invoice';

import type { InvoiceAiTool } from '@/types';

const INPUT =
  'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const LABEL =
  'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';

type Props = {
  readonly defaultCategory?: string | null | undefined;
  readonly defaultAiTool?: InvoiceAiTool | null | undefined;
  readonly categories: readonly string[];
};

/**
 * Campo autocomplete de categoría de factura con sub-select condicional para herramientas IA específicas.
 *
 * @kind client
 * @feature admin/invoices
 * @route /admin/facturacion
 */
export function InvoiceCategoryField({
  defaultCategory,
  defaultAiTool,
  categories,
}: Props): React.ReactElement {
  const [category, setCategory] = useState<string>(defaultCategory ?? '');
  const showAi = looksLikeAiCategory(category) || defaultAiTool != null;
  const dataListId = 'invoice-categories';

  return (
    <>
      <div>
        <label className={LABEL} htmlFor="invoice-category">Categoría</label>
        <input
          id="invoice-category"
          name="category"
          list={dataListId}
          defaultValue={defaultCategory ?? ''}
          placeholder="campaña, comisión, IA - Claude, software…"
          className={INPUT}
          onChange={(event) => setCategory(event.target.value)}
          maxLength={80}
        />
        <datalist id={dataListId}>
          {categories.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </div>

      {showAi && (
        <div>
          <label className={LABEL} htmlFor="invoice-ai-tool">Herramienta IA</label>
          <select id="invoice-ai-tool" name="aiTool" defaultValue={defaultAiTool ?? ''} className={INPUT}>
            <option value="">— sin definir —</option>
            {INVOICE_AI_TOOLS.map((value) => (
              <option key={value} value={value}>
                {INVOICE_AI_TOOL_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
