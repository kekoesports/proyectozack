'use client';

import { useState, useMemo, useRef, useTransition } from 'react';
import type { Target } from '@/types';
import {
  updateStatusAction,
  updateNotesAction,
  deleteTargetsAction,
  deleteAllTargetsAction,
  assignTargetsToBrandAction,
  importCSVAction,
} from '@/app/admin/(dashboard)/targets/actions';
import type { BrandUserRow } from '@/lib/queries/brandUsers';
import { TargetsEmptyState } from './TargetsEmptyState';
import { PLATFORMS } from './targets-constants';
import type { SortField, SortState, StatusFilter, StatusValue, PlatformValue } from './targets-constants';
import { exportTargetsCSV } from './export-csv';
import {
  StatusTabs,
  Toolbar,
  ImportResultBanner,
  BulkActionsBar,
  TableHeader,
} from './TargetsSpreadsheet.parts';
import { TargetRow } from './TargetsSpreadsheet.row';

/**
 * Tabla editable tipo spreadsheet para gestionar targets de outreach (Twitch + YouTube).
 * Soporta búsqueda, filtros por status/platform, edición inline de notes/status,
 * bulk delete, asignación a brand e importación de CSV. Distinto de Campañas (firmadas).
 *
 * @kind client
 * @feature admin/targets
 * @route /admin/targets
 */
export function TargetsSpreadsheet({
  targets,
  brands = [],
}: {
  targets: Target[];
  brands?: BrandUserRow[];
}): React.ReactElement {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [platformFilter, setPlatformFilter] = useState<Set<PlatformValue>>(new Set());
  const [sort, setSort] = useState<SortState>({ field: 'createdAt', dir: 'desc' });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [openStatusMenu, setOpenStatusMenu] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [batchFilter, setBatchFilter] = useState<Set<string>>(new Set());
  const [brandUserId, setBrandUserId] = useState('');
  const [isPending, startTransition] = useTransition();
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; errors: number } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { todos: targets.length, pendiente: 0, contactado: 0, finalizado: 0, descartado: 0 };
    for (const t of targets) counts[t.status]++;
    return counts;
  }, [targets]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of targets) counts[t.platform] = (counts[t.platform] ?? 0) + 1;
    return counts;
  }, [targets]);

  const activePlatforms = useMemo(
    () => PLATFORMS.filter((p) => (platformCounts[p] ?? 0) > 0),
    [platformCounts],
  );

  const activeBatches = useMemo(() => {
    const seen = new Set<string>();
    for (const t of targets) if (t.importBatchId) seen.add(t.importBatchId);
    return [...seen].sort();
  }, [targets]);

  const toggleBatch = (b: string): void => {
    setBatchFilter((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  };

  const handleImportCSV = (): void => {
    const file = csvInputRef.current?.files?.[0];
    if (!file) return;
    setImportResult(null);
    const fd = new FormData();
    fd.set('file', file);
    startTransition(async () => {
      try {
        const res = await importCSVAction(fd);
        setImportResult({ inserted: res.inserted, updated: res.updated, errors: res.errors });
      } catch {
        setImportResult({ inserted: 0, updated: 0, errors: -1 });
      } finally {
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    });
  };

  const filtered = useMemo(() => {
    let list = targets;

    if (statusFilter !== 'todos') {
      list = list.filter((t) => t.status === statusFilter);
    }

    if (platformFilter.size > 0) {
      list = list.filter((t) => platformFilter.has(t.platform as PlatformValue));
    }

    if (batchFilter.size > 0) {
      list = list.filter((t) => t.importBatchId != null && batchFilter.has(t.importBatchId));
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.username.toLowerCase().includes(q) ||
          (t.fullName?.toLowerCase().includes(q) ?? false) ||
          (t.bio?.toLowerCase().includes(q) ?? false) ||
          (t.importBatchId?.toLowerCase().includes(q) ?? false),
      );
    }

    return [...list].sort((a, b) => {
      const { field, dir } = sort;
      let cmp = 0;
      if (field === 'username') cmp = a.username.localeCompare(b.username, 'es');
      else if (field === 'followers') cmp = a.followers - b.followers;
      else if (field === 'status') cmp = a.status.localeCompare(b.status, 'es');
      else if (field === 'createdAt')
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return dir === 'desc' ? -cmp : cmp;
    });
  }, [targets, statusFilter, platformFilter, batchFilter, search, sort]);

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));
  const selectedIds = useMemo(() => [...selected], [selected]);

  const toggleAll = (): void => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const t of filtered) next.delete(t.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const t of filtered) next.add(t.id);
        return next;
      });
    }
  };

  const toggleOne = (id: number): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePlatform = (p: PlatformValue): void => {
    setPlatformFilter((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const toggleSort = (field: SortField): void => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { field, dir: field === 'username' || field === 'status' ? 'asc' : 'desc' },
    );
  };

  const sortArrow = (field: SortField): string =>
    sort.field === field ? (sort.dir === 'asc' ? ' \u2191' : ' \u2193') : '';

  const setStatus = (id: number, status: StatusValue): void => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', String(id));
      fd.set('status', status);
      await updateStatusAction(fd);
    });
  };

  const saveNotes = (id: number): void => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', String(id));
      fd.set('notes', notesValue);
      await updateNotesAction(fd);
      setEditingNotes(null);
    });
  };

  const handleDelete = (ids: number[]): void => {
    if (!confirm(`\u00bfEliminar ${ids.length} target${ids.length > 1 ? 's' : ''}?`)) return;
    const fd = new FormData();
    fd.set('ids', ids.join(','));
    startTransition(async () => {
      await deleteTargetsAction(fd);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    });
  };

  const handleAssignToBrand = (): void => {
    if (!brandUserId || selectedIds.length === 0) return;
    const fd = new FormData();
    fd.set('brandUserId', brandUserId);
    fd.set('ids', selectedIds.join(','));
    startTransition(async () => {
      await assignTargetsToBrandAction(fd);
      setSelected(new Set());
    });
  };

  const exportCSV = (): void => {
    const rows = filtered.filter((t) => selected.size === 0 || selected.has(t.id));
    exportTargetsCSV(rows);
  };

  const handleDeleteAll = (): void => {
    if (!confirm('\u00bfEliminar TODOS los targets? Esta acci\u00f3n no se puede deshacer.')) return;
    startTransition(async () => {
      await deleteAllTargetsAction();
      setSelected(new Set());
    });
  };

  if (targets.length === 0) {
    return <TargetsEmptyState />;
  }

  return (
    <div className="space-y-4">
      <StatusTabs
        statusFilter={statusFilter}
        statusCounts={statusCounts}
        setStatusFilter={setStatusFilter}
      />

      <Toolbar
        search={search}
        setSearch={setSearch}
        activePlatforms={[...activePlatforms]}
        platformFilter={platformFilter}
        platformCounts={platformCounts}
        togglePlatform={togglePlatform}
        activeBatches={activeBatches}
        batchFilter={batchFilter}
        toggleBatch={toggleBatch}
        filteredCount={filtered.length}
        totalCount={targets.length}
        csvInputRef={csvInputRef}
        handleImportCSV={handleImportCSV}
        isPending={isPending}
        exportCSV={exportCSV}
        handleDeleteAll={handleDeleteAll}
      />

      {importResult && (
        <ImportResultBanner
          importResult={importResult}
          onClose={() => setImportResult(null)}
        />
      )}

      {selected.size > 0 && (
        <BulkActionsBar
          selectedSize={selected.size}
          brands={brands}
          brandUserId={brandUserId}
          setBrandUserId={setBrandUserId}
          handleAssignToBrand={handleAssignToBrand}
          isPending={isPending}
          selectedIds={selectedIds}
          handleDelete={handleDelete}
          clearSelection={() => setSelected(new Set())}
        />
      )}

      {openStatusMenu !== null && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenStatusMenu(null)} />
      )}

      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[720px]">
          <TableHeader
            allSelected={allSelected}
            toggleAll={toggleAll}
            sort={sort}
            toggleSort={toggleSort}
            sortArrow={sortArrow}
          />
          <tbody className="divide-y divide-sp-admin-border/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center text-sp-admin-muted text-sm">
                  {search || statusFilter !== 'todos' || platformFilter.size > 0
                    ? 'Sin resultados para los filtros aplicados'
                    : 'Sin targets'}
                </td>
              </tr>
            ) : (
              filtered.map((target, i) => (
                <TargetRow
                  key={target.id}
                  target={target}
                  index={i}
                  selected={selected}
                  toggleOne={toggleOne}
                  openStatusMenu={openStatusMenu}
                  setOpenStatusMenu={setOpenStatusMenu}
                  editingNotes={editingNotes}
                  setEditingNotes={setEditingNotes}
                  notesValue={notesValue}
                  setNotesValue={setNotesValue}
                  setStatus={setStatus}
                  saveNotes={saveNotes}
                  handleDelete={handleDelete}
                  isPending={isPending}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
