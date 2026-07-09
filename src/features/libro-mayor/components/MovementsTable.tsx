'use client';

import { useMemo, useState } from 'react';
import type { LedgerAccount, LedgerMovement } from '@/features/libro-mayor/parser/types';
import { categoryLabel, resolveAccountMapping } from '@/features/libro-mayor/mapping/resolve-category';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

type FlatMovement = LedgerMovement & {
  readonly accountCode: string;
  readonly accountName: string;
};

type Props = {
  readonly accounts: readonly LedgerAccount[];
};

type MovementType = 'todos' | 'debe' | 'haber';

const PAGE_SIZE = 50;

function flattenMovements(accounts: readonly LedgerAccount[]): readonly FlatMovement[] {
  const flat: FlatMovement[] = [];
  for (const a of accounts) {
    for (const m of a.movements) {
      flat.push({ ...m, accountCode: a.code, accountName: a.name });
    }
  }
  return flat.sort((x, y) => x.date.localeCompare(y.date));
}

export function MovementsTable({ accounts }: Props): React.ReactElement {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [accountQuery, setAccountQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('todos');
  const [conceptQuery, setConceptQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MovementType>('todos');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [page, setPage] = useState(0);

  const allFlat = useMemo(() => flattenMovements(accounts), [accounts]);

  const pendingAccountCodes = useMemo(() => {
    const set = new Set<string>();
    for (const a of accounts) if (Math.abs(a.totalSaldo) > 0.02) set.add(a.code);
    return set;
  }, [accounts]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const a of accounts) {
      const label = categoryLabel(a.code);
      set.add(label);
    }
    return Array.from(set).sort();
  }, [accounts]);

  const filtered = useMemo(() => {
    const aq = accountQuery.trim().toLowerCase();
    const cq = conceptQuery.trim().toLowerCase();
    return allFlat.filter((m) => {
      if (dateFrom && m.date < dateFrom) return false;
      if (dateTo && m.date > dateTo) return false;
      if (aq && !`${m.accountCode} ${m.accountName}`.toLowerCase().includes(aq)) return false;
      if (groupFilter !== 'todos' && m.accountCode[0] !== groupFilter) return false;
      if (cq && cq.length >= 3 && !m.concept.toLowerCase().includes(cq)) return false;
      if (typeFilter === 'debe' && m.debe <= 0) return false;
      if (typeFilter === 'haber' && m.haber <= 0) return false;
      if (categoryFilter !== 'todos' && categoryLabel(m.accountCode) !== categoryFilter) return false;
      if (pendingOnly && !pendingAccountCodes.has(m.accountCode)) return false;
      return true;
    });
  }, [allFlat, dateFrom, dateTo, accountQuery, groupFilter, conceptQuery, typeFilter, categoryFilter, pendingOnly, pendingAccountCodes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const start = clampedPage * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <section aria-label="Movimientos contables" className="space-y-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-sp-admin-fg">Movimientos ({filtered.length}/{allFlat.length})</h2>
        <p className="text-xs text-sp-admin-muted">
          Pág. {clampedPage + 1} de {totalPages}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          className="rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-orange"
          aria-label="Fecha desde"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          className="rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-orange"
          aria-label="Fecha hasta"
        />
        <input
          type="search"
          value={accountQuery}
          onChange={(e) => { setAccountQuery(e.target.value); setPage(0); }}
          placeholder="Cuenta / nombre…"
          className="rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:ring-1 focus:ring-sp-orange"
          aria-label="Filtrar por cuenta"
        />
        <select
          value={groupFilter}
          onChange={(e) => { setGroupFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-orange"
          aria-label="Grupo PGC"
        >
          <option value="todos">Todos los grupos</option>
          <option value="1">1 · Financiación</option>
          <option value="2">2 · Activo</option>
          <option value="4">4 · Acreedores/deudores</option>
          <option value="5">5 · Financieras</option>
          <option value="6">6 · Gastos</option>
          <option value="7">7 · Ingresos</option>
        </select>
        <input
          type="search"
          value={conceptQuery}
          onChange={(e) => { setConceptQuery(e.target.value); setPage(0); }}
          placeholder="Concepto (mín. 3 chars)…"
          className="rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:ring-1 focus:ring-sp-orange"
          aria-label="Buscar en concepto"
        />
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as MovementType); setPage(0); }}
          className="rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-orange"
          aria-label="Tipo de movimiento"
        >
          <option value="todos">Debe y haber</option>
          <option value="debe">Solo debe</option>
          <option value="haber">Solo haber</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
          className="col-span-2 rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-orange md:col-span-2"
          aria-label="Categoría CRM"
        >
          <option value="todos">Todas las categorías</option>
          {availableCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="col-span-2 inline-flex items-center gap-2 rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text md:col-span-2">
          <input type="checkbox" checked={pendingOnly} onChange={(e) => { setPendingOnly(e.target.checked); setPage(0); }} />
          Solo cuentas con saldo pendiente
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-sp-admin-border bg-sp-admin-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sp-admin-border bg-sp-admin-bg/40 text-[11px] font-semibold uppercase tracking-wider text-sp-admin-muted">
              <th className="px-3 py-3 text-left">Fecha</th>
              <th className="px-3 py-3 text-left">Doc</th>
              <th className="px-3 py-3 text-left">Cuenta</th>
              <th className="px-3 py-3 text-left">Nombre</th>
              <th className="px-3 py-3 text-left">Concepto</th>
              <th className="px-3 py-3 text-right">Debe</th>
              <th className="px-3 py-3 text-right">Haber</th>
              <th className="px-3 py-3 text-right">Saldo</th>
              <th className="px-3 py-3 text-left">Contra</th>
              <th className="px-3 py-3 text-left">Categoría</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-sm text-sp-admin-muted">
                  Sin movimientos para los filtros activos.
                </td>
              </tr>
            ) : pageRows.map((m, i) => {
              const mapping = resolveAccountMapping(m.accountCode);
              return (
                <tr key={`${m.accountCode}-${i}-${start}`} className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover/40">
                  <td className="px-3 py-2 tabular-nums text-xs text-sp-admin-text">{m.date}</td>
                  <td className="px-3 py-2 font-mono text-xs text-sp-admin-muted">{m.document || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-sp-admin-text">{m.accountCode}</td>
                  <td className="px-3 py-2 text-xs text-sp-admin-text">{m.accountName}</td>
                  <td className="px-3 py-2 text-xs text-sp-admin-text">{m.concept}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-400/80">
                    {m.debe > 0 ? EUR.format(m.debe) : ''}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-400/80">
                    {m.haber > 0 ? EUR.format(m.haber) : ''}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-sp-admin-text">
                    {EUR.format(m.saldo)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-sp-admin-muted">{m.contrapartida || '—'}</td>
                  <td className="px-3 py-2 text-[11px] text-sp-admin-muted">{mapping?.category ?? 'Sin categoría'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav className="flex items-center justify-end gap-2" aria-label="Paginación">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={clampedPage === 0}
            className="rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-1.5 text-xs text-sp-admin-text disabled:opacity-40"
          >
            ← Anterior
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={clampedPage >= totalPages - 1}
            className="rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-1.5 text-xs text-sp-admin-text disabled:opacity-40"
          >
            Siguiente →
          </button>
        </nav>
      ) : null}
    </section>
  );
}
