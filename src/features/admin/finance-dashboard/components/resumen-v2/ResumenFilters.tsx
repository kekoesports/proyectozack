'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import type { FinanzasPeriod } from '@/types/finanzasResumen';

type Props = {
  readonly applied: FinanzasPeriod;
  /** Default YTD, para el botón "Restablecer". */
  readonly defaults: FinanzasPeriod;
};

const YTD_LABEL = 'Año en curso';

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/**
 * Selector de rango `from` / `to` para el resumen económico.
 * Al cambiar cualquiera de los dos inputs, hace `router.push` con los
 * nuevos searchParams; la página RSC se re-renderiza con el nuevo periodo.
 *
 * @kind client
 * @feature admin/finance-dashboard/resumen-v2
 */
export function ResumenFilters({ applied, defaults }: Props): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (key: 'from' | 'to', value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `/admin/finanzas/resumen?${qs}` : '/admin/finanzas/resumen');
      });
    },
    [router, searchParams],
  );

  const reset = useCallback(() => {
    startTransition(() => {
      router.push('/admin/finanzas/resumen');
    });
  }, [router]);

  const isYTD = applied.from === defaults.from && applied.to === defaults.to;

  return (
    <div
      className={`flex flex-wrap items-end gap-3 rounded-xl border border-sp-admin-border bg-sp-admin-card p-4 ${pending ? 'opacity-70' : ''}`}
      aria-busy={pending}
    >
      <FilterInput label="Desde" value={applied.from} onChange={(v) => update('from', v)} />
      <FilterInput label="Hasta" value={applied.to}   onChange={(v) => update('to', v)} />

      <div className="ml-auto flex items-baseline gap-3">
        <span className="text-xs text-sp-admin-muted">
          {isYTD ? YTD_LABEL : `${formatDate(applied.from)} — ${formatDate(applied.to)}`}
        </span>
        {!isYTD && (
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-sp-admin-border px-3 py-1.5 text-xs font-medium text-sp-admin-muted hover:border-sp-orange hover:text-sp-admin-fg"
          >
            Restablecer
          </button>
        )}
      </div>
    </div>
  );
}

type FilterInputProps = {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
};

function FilterInput({ label, value, onChange }: FilterInputProps): React.ReactElement {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sp-admin-muted">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-sp-admin-border bg-sp-admin-card px-3 py-1.5 text-sm font-medium text-sp-admin-fg focus:outline-none focus:ring-1 focus:ring-sp-orange"
      />
    </label>
  );
}
