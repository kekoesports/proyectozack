'use client';

import { useState } from 'react';
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

      {activeBatches.filter((b) => b in BATCH_LABELS).length > 0 && (
        <div className="flex items-center gap-1.5">
          {activeBatches.filter((b) => b in BATCH_LABELS).map((b) => {
            const isActive = batchFilter.has(b);
            const label = BATCH_LABELS[b]!;
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
  handleBulkStatus: (status: string) => void;
  clearSelection: () => void;
}>;

const BULK_STATUS_OPTIONS = [
  { value: 'pendiente',  label: 'Pendiente',  cls: 'text-amber-400 hover:bg-amber-900/20' },
  { value: 'contactado', label: 'Contactado', cls: 'text-blue-400 hover:bg-blue-900/20' },
  { value: 'descartado', label: 'Descartado', cls: 'text-sp-admin-muted hover:bg-sp-admin-hover' },
] as const;

export function BulkActionsBar({
  selectedSize,
  brands,
  brandUserId,
  setBrandUserId,
  handleAssignToBrand,
  isPending,
  selectedIds,
  handleDelete,
  handleBulkStatus,
  clearSelection,
}: BulkActionsBarProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-sp-admin-card border border-sp-admin-accent/30 rounded-lg flex-wrap">
      <span className="text-xs font-semibold text-sp-admin-accent tabular-nums shrink-0">
        {selectedSize} seleccionado{selectedSize > 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-1 border-l border-sp-admin-border/60 pl-3">
        <span className="text-[10px] text-sp-admin-muted mr-1">Estado:</span>
        {BULK_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleBulkStatus(opt.value)}
            disabled={isPending}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors disabled:opacity-40 ${opt.cls}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {brands.length > 0 && (
        <div className="flex items-center gap-1.5 border-l border-sp-admin-border/60 pl-3">
          <select
            value={brandUserId}
            onChange={(e) => setBrandUserId(e.target.value)}
            className="min-w-[180px] bg-sp-admin-bg rounded px-3 py-1.5 text-[11px] text-sp-admin-text border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-sp-admin-accent/40"
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
        </div>
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

type ConfirmDeleteAllModalProps = Readonly<{
  totalCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}>;

const CONFIRM_WORD = 'ELIMINAR';

/**
 * Modal de doble confirmación para borrar TODOS los targets.
 * El usuario debe escribir "ELIMINAR" exactamente para habilitar el botón.
 *
 * @kind client
 * @feature admin/targets
 */
export function ConfirmDeleteAllModal({ totalCount, onConfirm, onCancel }: ConfirmDeleteAllModalProps): React.ReactElement {
  const [typed, setTyped] = useState('');
  const isValid = typed === CONFIRM_WORD;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-all-title"
        className="w-full max-w-md mx-4 bg-sp-admin-card border border-red-500/40 rounded-xl shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center text-red-400">
            <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <h2 id="delete-all-title" className="text-sm font-semibold text-red-400">
              Eliminar todos los targets
            </h2>
            <p className="mt-1 text-xs text-sp-admin-muted">
              Esta acción borrará <span className="font-semibold text-sp-admin-text">{totalCount} target{totalCount !== 1 ? 's' : ''}</span> de forma permanente. No se puede deshacer.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm-input" className="block text-xs text-sp-admin-muted">
            Escribe <span className="font-mono font-semibold text-sp-admin-text">{CONFIRM_WORD}</span> para confirmar:
          </label>
          <input
            id="confirm-input"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-sp-admin-bg rounded-lg px-3 py-2 text-sm font-mono text-sp-admin-text border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
            placeholder={CONFIRM_WORD}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isValid}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Eliminar todo
          </button>
        </div>
      </div>
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
