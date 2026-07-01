'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import {
  AR_AGING_BUCKET_LABELS,
  AR_AGING_BUCKET_ORDER,
  type ArAgingBucketKey,
  type ArAgingFilters,
  type ArAgingSource,
} from '@/types/arAging';

const SOURCE_LABELS: Readonly<Record<ArAgingSource, string>> = {
  issued: 'Emitidas (Veri*factu)',
  internal: 'Internas',
};

type Props = {
  readonly applied: ArAgingFilters;
  readonly availableEntities: readonly string[];
  readonly availableBrands: readonly string[];
  readonly hasResults: boolean;
};

export function ArAgingFiltersBar({
  applied,
  availableEntities,
  availableBrands,
  hasResults,
}: Props): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (key: keyof ArAgingFilters, value: string | undefined) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `/admin/finanzas/cobros?${qs}` : '/admin/finanzas/cobros');
      });
    },
    [router, searchParams],
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push('/admin/finanzas/cobros');
    });
  }, [router]);

  const hasAnyFilter =
    Boolean(applied.bucket) ||
    Boolean(applied.entity) ||
    Boolean(applied.brand) ||
    Boolean(applied.source);

  return (
    <div
      className={`flex flex-wrap items-end gap-3 rounded-xl border border-sp-admin-border bg-sp-admin-card p-4 ${pending ? 'opacity-70' : ''}`}
      aria-busy={pending}
    >
      <FilterSelect
        label="Antigüedad"
        value={applied.bucket ?? ''}
        onChange={(v) => update('bucket', v || undefined)}
        options={[
          { value: '', label: 'Todas' },
          ...AR_AGING_BUCKET_ORDER.map((k: ArAgingBucketKey) => ({
            value: k,
            label: AR_AGING_BUCKET_LABELS[k],
          })),
        ]}
      />

      <FilterSelect
        label="Entidad"
        value={applied.entity ?? ''}
        onChange={(v) => update('entity', v || undefined)}
        options={[
          { value: '', label: 'Todas' },
          ...availableEntities.map((e) => ({ value: e, label: e })),
        ]}
        disabled={availableEntities.length === 0}
      />

      <FilterSelect
        label="Marca"
        value={applied.brand ?? ''}
        onChange={(v) => update('brand', v || undefined)}
        options={[
          { value: '', label: 'Todas' },
          ...availableBrands.map((b) => ({ value: b, label: b })),
        ]}
        disabled={availableBrands.length === 0}
      />

      <FilterSelect
        label="Origen"
        value={applied.source ?? ''}
        onChange={(v) => update('source', v || undefined)}
        options={[
          { value: '', label: 'Todos' },
          { value: 'issued', label: SOURCE_LABELS.issued },
          { value: 'internal', label: SOURCE_LABELS.internal },
        ]}
      />

      {hasAnyFilter && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto rounded-lg border border-sp-admin-border px-3 py-1.5 text-xs font-medium text-sp-admin-muted hover:border-sp-orange hover:text-sp-admin-fg"
        >
          Limpiar filtros
        </button>
      )}

      {!hasResults && hasAnyFilter && (
        <p className="ml-auto text-xs text-sp-admin-muted">
          Sin resultados con estos filtros
        </p>
      )}
    </div>
  );
}

// ── Sub ──────────────────────────────────────────────────────────────────────

type Option = { readonly value: string; readonly label: string };

type FilterSelectProps = {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly options: readonly Option[];
  readonly disabled?: boolean;
};

function FilterSelect({ label, value, onChange, options, disabled }: FilterSelectProps): React.ReactElement {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sp-admin-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-sp-admin-border bg-sp-admin-card px-3 py-1.5 text-sm font-medium text-sp-admin-fg focus:outline-none focus:ring-1 focus:ring-sp-orange disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
