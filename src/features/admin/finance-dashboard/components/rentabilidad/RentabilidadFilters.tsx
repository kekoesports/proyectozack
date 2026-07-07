'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, type FormEvent } from 'react';

type BrandOpt = { readonly id: number; readonly name: string };
type TalentOpt = { readonly id: number; readonly name: string };

type Props = {
  readonly defaults: { readonly from: string; readonly to: string };
  readonly applied:  { readonly from: string; readonly to: string };
  readonly brands:   readonly BrandOpt[];
  readonly talentos: readonly TalentOpt[];
};

const CAMPAIGN_STATUSES = [
  { value: 'todos',           label: 'Todos' },
  { value: 'propuesta',       label: 'Propuesta' },
  { value: 'negociacion',     label: 'Negociación' },
  { value: 'aprobada',        label: 'Aprobada' },
  { value: 'activa',          label: 'Activa' },
  { value: 'completada',      label: 'Completada' },
  { value: 'pendiente_pago',  label: 'Pendiente pago' },
  { value: 'pagada',          label: 'Pagada' },
] as const;

const MARGEN_CHIPS = [
  { value: 'todos',      label: 'Todos' },
  { value: 'rentable',   label: 'Rentables' },
  { value: 'bajo',       label: 'Margen bajo' },
  { value: 'negativo',   label: 'Negativos' },
  { value: 'sin_datos',  label: 'Sin datos' },
] as const;

const INPUT =
  'rounded-lg border border-sp-admin-border bg-sp-admin-bg px-2 py-1.5 text-[12px] text-sp-admin-fg outline-none focus:border-sp-admin-accent transition-colors';

export function RentabilidadFilters({ defaults, applied, brands, talentos }: Props): React.ReactElement {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const brandParam    = sp.get('marca') ?? '';
  const talentoParam  = sp.get('talento') ?? '';
  const estadoParam   = sp.get('estado') ?? 'todos';
  const margenParam   = sp.get('margen') ?? 'todos';

  function apply(next: URLSearchParams): void {
    startTransition(() => router.push(`?${next.toString()}`));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    const from = String(fd.get('from') ?? '').trim();
    const to   = String(fd.get('to')   ?? '').trim();
    const marca   = String(fd.get('marca')   ?? '').trim();
    const talento = String(fd.get('talento') ?? '').trim();
    const estado  = String(fd.get('estado')  ?? '').trim();
    if (from && from !== defaults.from) next.set('from', from);
    if (to   && to   !== defaults.to)   next.set('to', to);
    if (marca)   next.set('marca', marca);
    if (talento) next.set('talento', talento);
    if (estado && estado !== 'todos') next.set('estado', estado);
    if (margenParam !== 'todos') next.set('margen', margenParam);
    apply(next);
  }

  function setChip(value: string): void {
    const next = new URLSearchParams(sp.toString());
    if (value === 'todos') next.delete('margen');
    else next.set('margen', value);
    apply(next);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="rounded-xl border border-sp-border bg-sp-admin-card p-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted mb-1">Desde</label>
          <input type="date" name="from" defaultValue={applied.from} className={INPUT} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted mb-1">Hasta</label>
          <input type="date" name="to" defaultValue={applied.to} className={INPUT} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted mb-1">Marca</label>
          <select name="marca" defaultValue={brandParam} className={INPUT}>
            <option value="">Todas</option>
            {brands.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted mb-1">Talento</label>
          <select name="talento" defaultValue={talentoParam} className={INPUT}>
            <option value="">Todos</option>
            {talentos.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted mb-1">Estado campaña</label>
          <select name="estado" defaultValue={estadoParam} className={INPUT}>
            {CAMPAIGN_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="h-8 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="uppercase tracking-wider font-bold text-sp-admin-muted mr-1">Margen:</span>
        {MARGEN_CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setChip(c.value)}
            aria-pressed={margenParam === c.value}
            className={`px-2.5 py-1 rounded-full border transition-colors ${
              margenParam === c.value
                ? 'border-sp-admin-accent bg-sp-admin-accent/15 text-sp-admin-accent font-semibold'
                : 'border-sp-border text-sp-admin-muted hover:text-sp-admin-fg'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
