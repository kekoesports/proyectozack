'use client';

import type { BrandUserRow } from '@/lib/queries/brandUsers';
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  STATUS_LABELS,
  STATUS_TAB_COLORS,
  STATUS_FILTERS,
} from './targets-constants';
import type { SortField, SortState, StatusFilter, PlatformValue } from './targets-constants';
import { Th } from './ThSortable';

export const BATCH_LABELS: Record<string, string> = {
  'firecrawl-2026-04': 'Gaming',
  'firecrawl-cs2-2026-04': 'CS2',
};

type StatusTabsProps = Readonly<{
  statusFilter: StatusFilter;
  statusCounts: Record<StatusFilter, number>;
  setStatusFilter: (s: StatusFilter) => void;
}>;

export function StatusTabs({ statusFilter, statusCounts, setStatusFilter }: StatusTabsProps): React.ReactElement {
  return (
    <div className="flex items-center gap-1 border-b border-sp-admin-border">
      {STATUS_FILTERS.map((tab) => {
        const isActive = statusFilter === tab;
        const count = statusCounts[tab];
        const label = tab === 'todos' ? 'Todos' : STATUS_LABELS[tab];
        const colors = STATUS_TAB_COLORS[tab];

        return (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`relative px-4 py-2.5 text-xs font-semibold transition-colors ${
              isActive
                ? colors
                : 'text-sp-admin-muted hover:text-sp-admin-text border-transparent'
            } border-b-2 -mb-px`}
          >
            {label}
            <span className={`ml-1.5 tabular-nums ${isActive ? 'opacity-100' : 'opacity-50'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type ToolbarProps = Readonly<{
  search: string;
  setSearch: (v: string) => void;
  activePlatforms: PlatformValue[];
  platformFilter: Set<PlatformValue>;
  platformCounts: Record<string, number>;
  togglePlatform: (p: PlatformValue) => void;
  activeBatches: string[];
  batchFilter: Set<string>;
  toggleBatch: (b: string) => void;
  filteredCount: number;
  totalCount: number;
  csvInputRef: React.RefObject<HTMLInputElement | null>;
  handleImportCSV: () => void;
  isPending: boolean;
  exportCSV: () => void;
  handleDeleteAll: () => void;
}>;

export function Toolbar({
  search,
  setSearch,
  activePlatforms,
  platformFilter,
  platformCounts,
  togglePlatform,
  activeBatches,
  batchFilter,
  toggleBatch,
  filteredCount,
  totalCount,
  csvInputRef,
  handleImportCSV,
  isPending,
  exportCSV,
  handleDeleteAll,
}: ToolbarProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <div className="relative max-w-xs w-full">
        <svg
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sp-admin-muted/50 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <circle cx={11} cy={11} r={8} />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nombre, usuario o bio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-sp-admin-card rounded-lg pl-9 pr-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40 border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-sp-admin-accent/40 transition-all"
        />
      </div>

      {activePlatforms.length > 1 && (
        <div className="flex items-center gap-1.5">
          {activePlatforms.map((p) => {
            const isActive = platformFilter.has(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all border ${
                  isActive
                    ? 'border-current opacity-100'
                    : 'border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text opacity-60 hover:opacity-100'
                }`}
                style={isActive ? { color: PLATFORM_COLORS[p], borderColor: PLATFORM_COLORS[p] } : undefined}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: PLATFORM_COLORS[p] }}
                />
                {PLATFORM_LABELS[p]}
                <span className="tabular-nums opacity-60">{platformCounts[p]}</span>
              </button>
            );
          })}
        </div>
      )}

      {activeBatches.length > 1 && (
        <div className="flex items-center gap-1.5">
          {activeBatches.map((b) => {
            const isActive = batchFilter.has(b);
            const label = BATCH_LABELS[b] ?? b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => toggleBatch(b)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all border ${
                  isActive
                    ? 'border-sp-admin-accent text-sp-admin-accent opacity-100'
                    : 'border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text opacity-60 hover:opacity-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-sp-admin-muted tabular-nums mr-1">
          <span className="font-bold text-sp-admin-text">{filteredCount}</span>
          {filteredCount !== totalCount && ` / ${totalCount}`}
        </span>
        <input ref={csvInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
        <button
          type="button"
          onClick={() => csvInputRef.current?.click()}
          disabled={isPending}
          className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-semibold bg-sp-admin-accent text-sp-admin-bg hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {isPending ? 'Importando...' : 'Importar CSV'}
        </button>
        <button
          type="button"
          onClick={exportCSV}
          className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-semibold bg-sp-admin-card border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text transition-colors"
        >
          Exportar
        </button>
        <button
          type="button"
          onClick={handleDeleteAll}
          disabled={isPending}
          className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-semibold bg-red-900/20 border border-red-500/30 text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors disabled:opacity-40"
        >
          Limpiar todo
        </button>
      </div>
    </div>
  );
}

type ImportResultBannerProps = Readonly<{
  importResult: { inserted: number; updated: number; errors: number };
  onClose: () => void;
}>;

export function ImportResultBanner({ importResult, onClose }: ImportResultBannerProps): React.ReactElement {
  return (
    <div className="flex items-center gap-4 text-xs px-1">
      {importResult.errors === -1 ? (
        <span className="text-red-400">Error importando CSV</span>
      ) : (
        <>
          <span className="text-emerald-400">Importados: <strong>{importResult.inserted}</strong></span>
          {importResult.updated > 0 && <span className="text-blue-400">Actualizados: <strong>{importResult.updated}</strong></span>}
          {importResult.errors > 0 && <span className="text-red-400">Errores: <strong>{importResult.errors}</strong></span>}
        </>
      )}
      <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-[10px]">Cerrar</button>
    </div>
  );
}

type BulkActionsBarProps = Readonly<{
  selectedSize: number;
  brands: BrandUserRow[];
  brandUserId: string;
  setBrandUserId: (v: string) => void;
  handleAssignToBrand: () => void;
  isPending: boolean;
  selectedIds: number[];
  handleDelete: (ids: number[]) => void;
  clearSelection: () => void;
}>;

export function BulkActionsBar({
  selectedSize,
  brands,
  brandUserId,
  setBrandUserId,
  handleAssignToBrand,
  isPending,
  selectedIds,
  handleDelete,
  clearSelection,
}: BulkActionsBarProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-sp-admin-card border border-sp-admin-accent/30 rounded-lg">
      <span className="text-xs font-semibold text-sp-admin-accent tabular-nums">
        {selectedSize} seleccionado{selectedSize > 1 ? 's' : ''}
      </span>
      {brands.length > 0 && (
        <>
          <select
            value={brandUserId}
            onChange={(e) => setBrandUserId(e.target.value)}
            className="min-w-[200px] bg-sp-admin-bg rounded px-3 py-1.5 text-[11px] text-sp-admin-text border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-sp-admin-accent/40"
          >
            <option value="">Asignar a marca...</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name} ({brand.email})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAssignToBrand}
            disabled={isPending || !brandUserId}
            className="px-3 py-1 rounded text-[11px] font-semibold text-sp-admin-text hover:bg-sp-admin-hover transition-colors disabled:opacity-40"
          >
            Asignar
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => handleDelete(selectedIds)}
        disabled={isPending}
        className="ml-auto px-3 py-1 rounded text-[11px] font-semibold text-red-400 hover:bg-red-900/20 transition-colors"
      >
        Eliminar
      </button>
      <button
        type="button"
        onClick={clearSelection}
        aria-label="Deseleccionar todo"
        className="text-sp-admin-muted hover:text-sp-admin-text transition-colors"
      >
        <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

type TableHeaderProps = Readonly<{
  allSelected: boolean;
  toggleAll: () => void;
  sort: SortState;
  toggleSort: (field: SortField) => void;
  sortArrow: (field: SortField) => string;
}>;

export function TableHeader({ allSelected, toggleAll, sort, toggleSort, sortArrow }: TableHeaderProps): React.ReactElement {
  return (
    <thead>
      <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
        <th className="px-3 py-2.5 w-8">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="rounded border-sp-admin-border bg-sp-admin-bg accent-sp-admin-accent"
          />
        </th>
        <Th className="w-8 text-center">#</Th>
        <Th sortable field="username" sort={sort} onSort={toggleSort} arrow={sortArrow}>
          Perfil
        </Th>
        <Th sortable field="followers" sort={sort} onSort={toggleSort} arrow={sortArrow} className="w-28 text-right">
          Audiencia
        </Th>
        <Th className="max-w-[240px]">Descripci&oacute;n</Th>
        <Th className="w-20">Fuente</Th>
        <Th sortable field="status" sort={sort} onSort={toggleSort} arrow={sortArrow} className="w-28">
          Estado
        </Th>
        <Th className="min-w-[160px]">Notas</Th>
        <Th className="w-8" />
      </tr>
    </thead>
  );
}
