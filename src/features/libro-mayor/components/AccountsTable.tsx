'use client';

import { useMemo, useState } from 'react';
import type { LedgerAccount } from '@/features/libro-mayor/parser/types';
import { resolveAccountMapping, resolvePgcGroup } from '@/features/libro-mayor/mapping/resolve-category';
import type { PgcGroupCode } from '@/features/libro-mayor/mapping/account-map';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

type Props = {
  readonly accounts: readonly LedgerAccount[];
};

type GroupFilter = 'todos' | PgcGroupCode;

const GROUP_OPTIONS: readonly { readonly value: GroupFilter; readonly label: string }[] = [
  { value: 'todos', label: 'Todos los grupos' },
  { value: '1', label: '1 · Financiación básica' },
  { value: '2', label: '2 · Activo no corriente' },
  { value: '4', label: '4 · Acreedores/deudores' },
  { value: '5', label: '5 · Cuentas financieras' },
  { value: '6', label: '6 · Compras y gastos' },
  { value: '7', label: '7 · Ventas e ingresos' },
];

export function AccountsTable({ accounts }: Props): React.ReactElement {
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('todos');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [nonZeroOnly, setNonZeroOnly] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (groupFilter !== 'todos' && a.code[0] !== groupFilter) return false;
      const mapping = resolveAccountMapping(a.code);
      if (criticalOnly && !mapping?.critical) return false;
      if (nonZeroOnly && Math.abs(a.totalSaldo) < 0.02) return false;
      if (q) {
        const hay = `${a.code} ${a.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [accounts, groupFilter, criticalOnly, nonZeroOnly, query]);

  return (
    <section aria-label="Cuentas contables" className="space-y-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-sp-admin-fg">Cuentas ({filtered.length}/{accounts.length})</h2>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar código o nombre…"
          className="w-full max-w-xs rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:ring-1 focus:ring-sp-orange"
          aria-label="Buscar cuenta"
        />
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value as GroupFilter)}
          className="rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-orange"
          aria-label="Filtrar por grupo PGC"
        >
          {GROUP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text">
          <input type="checkbox" checked={criticalOnly} onChange={(e) => setCriticalOnly(e.target.checked)} />
          Solo críticas
        </label>
        <label className="inline-flex items-center gap-2 rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text">
          <input type="checkbox" checked={nonZeroOnly} onChange={(e) => setNonZeroOnly(e.target.checked)} />
          Saldo distinto de 0
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-sp-admin-border bg-sp-admin-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sp-admin-border bg-sp-admin-bg/40 text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">
              <th className="px-4 py-3 text-left">Cuenta</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Grupo PGC</th>
              <th className="px-4 py-3 text-right">Debe</th>
              <th className="px-4 py-3 text-right">Haber</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3 text-left">Categoría CRM</th>
              <th className="px-4 py-3 text-left">Riesgo / nota</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-sp-admin-muted">
                  No hay cuentas para los filtros activos.
                </td>
              </tr>
            ) : filtered.map((a) => {
              const mapping = resolveAccountMapping(a.code);
              const pgc = resolvePgcGroup(a.code);
              const saldoTone = a.totalSaldo > 0.02 ? 'text-emerald-400' : a.totalSaldo < -0.02 ? 'text-red-400' : 'text-sp-admin-muted';
              return (
                <tr key={a.code} className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover/40">
                  <td className="px-4 py-2 font-mono text-xs text-sp-admin-text">{a.code}</td>
                  <td className="px-4 py-2 text-sp-admin-text">{a.name}</td>
                  <td className="px-4 py-2 text-xs text-sp-admin-muted">
                    {pgc ? `${pgc.code} · ${pgc.name}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-emerald-400/80">{EUR.format(a.totalDebe)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-400/80">{EUR.format(a.totalHaber)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${saldoTone}`}>{EUR.format(a.totalSaldo)}</td>
                  <td className="px-4 py-2 text-xs">
                    {mapping ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sp-admin-text">{mapping.category}</span>
                        {mapping.critical ? (
                          <span className="text-[9px] font-black uppercase tracking-wider text-red-400/80">★</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sp-admin-muted">Sin categoría</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-sp-admin-muted">{mapping?.riskNote ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

