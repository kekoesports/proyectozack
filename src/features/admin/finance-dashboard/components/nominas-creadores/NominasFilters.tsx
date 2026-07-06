'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface Props {
  readonly defaults: { readonly from: string; readonly to: string };
  readonly applied: { readonly from: string; readonly to: string };
  readonly personas: readonly string[];
  readonly talentos: readonly { readonly id: number; readonly name: string }[];
  readonly brands: readonly { readonly id: number; readonly name: string }[];
}

const TIPO_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'nominas', label: 'Nóminas' },
  { value: 'talentos', label: 'Pagos a talentos' },
  { value: 'seguridad_social', label: 'SS / autónomos' },
];

const ESTADO_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'cancelado', label: 'Cancelado' },
];

export function NominasFilters({ defaults, applied, personas, talentos, brands }: Props): React.ReactElement {
  const router = useRouter();
  const search = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === 'todos') params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `?${qs}` : '?', { scroll: false }));
  }

  const tipo = search.get('tipo') ?? 'todos';
  const estado = search.get('estado') ?? 'todos';
  const persona = search.get('persona') ?? '';
  const talento = search.get('talento') ?? '';
  const marca = search.get('marca') ?? '';

  return (
    <form
      className="rounded-2xl border border-sp-border bg-sp-admin-card p-4 grid gap-3 md:grid-cols-4 items-end"
      onSubmit={(e) => e.preventDefault()}
    >
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Desde
        <input type="date" defaultValue={applied.from}
          onBlur={(e) => updateParams({ from: e.target.value || defaults.from })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg"
        />
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Hasta
        <input type="date" defaultValue={applied.to}
          onBlur={(e) => updateParams({ to: e.target.value || defaults.to })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg"
        />
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Tipo
        <select value={tipo} onChange={(e) => updateParams({ tipo: e.target.value })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg">
          {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Estado
        <select value={estado} onChange={(e) => updateParams({ estado: e.target.value })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg">
          {ESTADO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Persona
        <select value={persona} onChange={(e) => updateParams({ persona: e.target.value })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg"
          disabled={personas.length === 0}>
          <option value="">Todas {personas.length === 0 ? '(sin datos)' : ''}</option>
          {personas.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Talento
        <select value={talento} onChange={(e) => updateParams({ talento: e.target.value })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg"
          disabled={talentos.length === 0}>
          <option value="">Todos {talentos.length === 0 ? '(sin datos)' : ''}</option>
          {talentos.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Marca
        <select value={marca} onChange={(e) => updateParams({ marca: e.target.value })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg"
          disabled={brands.length === 0}>
          <option value="">Todas {brands.length === 0 ? '(sin datos)' : ''}</option>
          {brands.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
      </label>
      {isPending ? (
        <span className="md:col-span-4 text-[11px] text-sp-admin-muted">Actualizando…</span>
      ) : null}
    </form>
  );
}
