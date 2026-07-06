'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface Props {
  readonly defaults: { readonly from: string; readonly to: string };
  readonly applied: { readonly from: string; readonly to: string };
  readonly clients: readonly { readonly id: number; readonly name: string }[];
  readonly brands: readonly { readonly id: number; readonly name: string }[];
}

const STATUSES = ['todas', 'emitida', 'parcial', 'cobrada', 'vencida', 'cancelada', 'pendiente'] as const;
const TIPOS = [
  { value: 'todas',    label: 'Todas' },
  { value: 'internal', label: 'Internas' },
  { value: 'issued',   label: 'Emitidas oficiales' },
] as const;

/**
 * Filtros persistentes por URL params. No mutan estado local — el router
 * push cambia la URL y el server component re-renderiza con los datos.
 * "Aplicar" para no disparar re-render en cada tecla.
 */
export function IngresosFilters({ defaults, applied, clients, brands }: Props): React.ReactElement {
  const router = useRouter();
  const search = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === 'todas') {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `?${qs}` : '?', { scroll: false }));
  }

  const cliente = search.get('cliente') ?? '';
  const marca = search.get('marca') ?? '';
  const estado = search.get('estado') ?? 'todas';
  const tipo = search.get('tipo') ?? 'todas';

  return (
    <form
      className="rounded-2xl border border-sp-border bg-sp-admin-card p-4 grid gap-3 md:grid-cols-6 items-end"
      onSubmit={(e) => e.preventDefault()}
    >
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Desde
        <input
          type="date"
          defaultValue={applied.from}
          onBlur={(e) => updateParams({ from: e.target.value || defaults.from })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg"
        />
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Hasta
        <input
          type="date"
          defaultValue={applied.to}
          onBlur={(e) => updateParams({ to: e.target.value || defaults.to })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg"
        />
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Cliente
        <select
          value={cliente}
          onChange={(e) => updateParams({ cliente: e.target.value })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg"
          disabled={clients.length === 0}
        >
          <option value="">Todos {clients.length === 0 ? '(sin clientes)' : ''}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Marca
        <select
          value={marca}
          onChange={(e) => updateParams({ marca: e.target.value })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg"
          disabled={brands.length === 0}
        >
          <option value="">Todas {brands.length === 0 ? '(sin marcas)' : ''}</option>
          {brands.map((b) => (
            <option key={b.id} value={b.name}>{b.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Estado
        <select
          value={estado}
          onChange={(e) => updateParams({ estado: e.target.value })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'todas' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Tipo
        <select
          value={tipo}
          onChange={(e) => updateParams({ tipo: e.target.value })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg"
        >
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      {isPending ? (
        <span className="md:col-span-6 text-[11px] text-sp-admin-muted">Actualizando…</span>
      ) : null}
    </form>
  );
}
