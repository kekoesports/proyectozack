'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { EXPENSE_GROUP_LABELS, EXPENSE_SUBTYPE_LABELS } from '@/lib/schemas/invoice';

interface Props {
  readonly defaults: { readonly from: string; readonly to: string };
  readonly applied: { readonly from: string; readonly to: string };
}

const GROUP_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'campaign_direct', label: EXPENSE_GROUP_LABELS.campaign_direct },
  { value: 'operational', label: EXPENSE_GROUP_LABELS.operational },
  { value: 'sin_clasificar', label: 'Sin clasificar' },
];

const CLASSIFICATION_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'clasificados', label: 'Clasificados' },
  { value: 'sin_clasificar', label: 'Sin clasificar' },
];

const ESTADO_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'cancelado', label: 'Cancelado' },
];

/**
 * Filtros persistentes por URL params. La lista de subtipos es la del
 * enum vigente — se ofrecen todos aunque no tengan datos hoy.
 */
export function GastosFilters({ defaults, applied }: Props): React.ReactElement {
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

  const grupo = search.get('grupo') ?? 'todos';
  const subtipo = search.get('subtipo') ?? '';
  const estado = search.get('estado') ?? 'todos';
  const clasificacion = search.get('clasificacion') ?? 'todos';
  const proveedor = search.get('proveedor') ?? '';

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
        Grupo
        <select value={grupo} onChange={(e) => updateParams({ grupo: e.target.value })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg">
          {GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted">
        Subtipo
        <select value={subtipo} onChange={(e) => updateParams({ subtipo: e.target.value })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg">
          <option value="">Todos</option>
          {Object.entries(EXPENSE_SUBTYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
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
        Clasificación
        <select value={clasificacion} onChange={(e) => updateParams({ clasificacion: e.target.value })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg">
          {CLASSIFICATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide font-bold text-sp-admin-muted md:col-span-2">
        Proveedor (contiene)
        <input type="text" defaultValue={proveedor} placeholder="Nombre del proveedor…"
          onBlur={(e) => updateParams({ proveedor: e.target.value.trim() })}
          className="rounded-md border border-sp-border bg-sp-admin-card px-2 py-1.5 text-sm text-sp-admin-fg"
        />
      </label>
      {isPending ? (
        <span className="md:col-span-4 text-[11px] text-sp-admin-muted">Actualizando…</span>
      ) : null}
    </form>
  );
}
