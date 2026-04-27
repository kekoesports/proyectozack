'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import {
  INVOICE_COMPANIES,
  INVOICE_COMPANY_LABELS,
} from '@/lib/schemas/invoice';

const INPUT =
  'rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const LABEL =
  'block text-[10px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';

type Props = {
  readonly company: string;
  readonly from: string;
  readonly to: string;
  readonly brandId: string;
  readonly talentId: string;
  readonly brands: readonly { readonly id: number; readonly name: string }[];
  readonly talents: readonly { readonly id: number; readonly name: string }[];
};

/**
 * Filtros sticky del P&L (rango de fechas y empresas) con sincronización a la URL.
 *
 * @kind client
 * @feature admin/pnl
 * @route /admin/pl
 */
export function PnLFilters(props: Props): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function applyFilters(formData: FormData): void {
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string' && value.trim() !== '') params.set(key, value);
    }
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/admin/pl?${qs}` : '/admin/pl');
    });
  }

  function exportCsv(): void {
    const params = new URLSearchParams();
    if (props.company) params.set('company', props.company);
    if (props.from) params.set('from', props.from);
    if (props.to) params.set('to', props.to);
    if (props.brandId) params.set('brandId', props.brandId);
    if (props.talentId) params.set('talentId', props.talentId);
    window.location.href = `/admin/pl/export?${params.toString()}`;
  }

  return (
    <form
      action={applyFilters}
      className="sticky top-0 z-10 flex flex-wrap items-end gap-3 rounded-2xl border border-sp-admin-border bg-sp-admin-card/95 p-4 backdrop-blur"
    >
      <div className="flex flex-col">
        <label className={LABEL} htmlFor="pl-company">Empresa</label>
        <select id="pl-company" name="company" defaultValue={props.company} className={INPUT}>
          <option value="">Combinado</option>
          {INVOICE_COMPANIES.map((value) => (
            <option key={value} value={value}>{INVOICE_COMPANY_LABELS[value]}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className={LABEL} htmlFor="pl-from">Desde</label>
        <input id="pl-from" name="from" type="date" defaultValue={props.from} className={INPUT} />
      </div>
      <div className="flex flex-col">
        <label className={LABEL} htmlFor="pl-to">Hasta</label>
        <input id="pl-to" name="to" type="date" defaultValue={props.to} className={INPUT} />
      </div>
      <div className="flex flex-col">
        <label className={LABEL} htmlFor="pl-brand">Marca</label>
        <select id="pl-brand" name="brandId" defaultValue={props.brandId} className={INPUT}>
          <option value="">Todas</option>
          {props.brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className={LABEL} htmlFor="pl-talent">Talent</label>
        <select id="pl-talent" name="talentId" defaultValue={props.talentId} className={INPUT}>
          <option value="">Todos</option>
          {props.talents.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-full border border-sp-admin-border px-4 py-2 text-sm font-semibold text-sp-admin-text transition-colors hover:bg-sp-admin-hover"
        >
          Exportar CSV
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-sp-admin-accent px-4 py-2 text-sm font-bold text-sp-admin-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
    </form>
  );
}
