'use client';

import { useState, useMemo, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Target } from '@/types';
import {
  updateNotesAction,
  deleteTargetsAction,
  assignTargetsToBrandAction,
  importCSVAction,
} from '@/app/admin/(dashboard)/targets/actions';
import { updateCreatorFeedbackAction } from '@/app/admin/(dashboard)/targets/profile-actions';
import { creatorFeedbackSchema } from '@/lib/schemas/creator-search-profile';
import { updateTargetStatusSchema } from '@/lib/schemas/target';
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
import { CreatorFeedbackForm } from './CreatorFeedbackForm';

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
  platformFilter,
  togglePlatform,
}: {
  targets: Target[];
  brands?: BrandUserRow[];
  platformFilter: ReadonlySet<PlatformValue>;
  togglePlatform: (platform: PlatformValue) => void;
}): React.ReactElement {
  const router = useRouter();
  // A frozen, explicit selection shared with the inline decision form; no status mutation until submit.
  const [feedback, setFeedback] = useState<{ ids: number[]; status: StatusValue } | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pendiente');
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
    const counts: Record<StatusFilter, number> = { todos: targets.filter(t => t.status !== 'descartado').length, pendiente: 0, contactado: 0, finalizado: 0, descartado: 0 };
    for (const t of targets) counts[t.status]++;
    return counts;
  }, [targets]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of targets) {
      if (statusFilter === 'descartado' ? t.status !== 'descartado' : t.status === 'descartado') continue;
      counts[t.platform] = (counts[t.platform] ?? 0) + 1;
    }
    return counts;
  }, [targets, statusFilter]);

  const activePlatforms = useMemo(
    () => PLATFORMS.filter((p) => (platformCounts[p] ?? 0) > 0 || platformFilter.has(p)),
    [platformCounts, platformFilter],
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

    list = list.filter(t => statusFilter === 'todos' ? t.status !== 'descartado' : t.status === statusFilter);

    if (platformFilter.size > 0) {
      list = list.filter((t) => platformFilter.has(t.platform));
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
      else if (field === 'followers') {
        // Unknown stays last in either direction; a measured zero remains a sortable value.
        if (a.followers == null || b.followers == null) {
          if (a.followers == null && b.followers == null) return 0;
          return a.followers == null ? 1 : -1;
        }
        cmp = a.followers - b.followers;
      }
      else if (field === 'status') cmp = a.status.localeCompare(b.status, 'es');
      else if (field === 'createdAt')
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return dir === 'desc' ? -cmp : cmp;
    });
  }, [targets, statusFilter, platformFilter, batchFilter, search, sort]);

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));
  // Hidden selections are not an action target. Keep counts and all bulk handlers on the same visible set.
  const visibleIds = useMemo(() => new Set(filtered.map((target) => target.id)), [filtered]);
  const selectedIds = useMemo(() => filtered.filter((target) => selected.has(target.id)).map((target) => target.id), [filtered, selected]);
  const feedbackIds = useMemo(() => feedback?.ids.filter((id) => visibleIds.has(id)) ?? [], [feedback, visibleIds]);

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
    setFeedbackMessage(null);
    setFeedback({ ids: [id], status });
  };

  const saveFeedback = (input: unknown): void => {
    const parsed = creatorFeedbackSchema.safeParse(input);
    if (!feedback || feedbackIds.length === 0 || !parsed.success || isPending) return;
    // Revalidate again at submit; filters may have changed while the decision form was open.
    const request = { ids: feedbackIds, status: feedback.status };
    startTransition(async () => {
      let saved = 0;
      try {
        for (const targetId of request.ids) {
          const result = await updateCreatorFeedbackAction({ ...parsed.data, targetId, status: request.status });
          if (!result.ok) {
            setFeedbackMessage(`${saved}/${request.ids.length} decisiones guardadas. ${result.error ?? 'Recarga antes de repetir las pendientes.'}`);
            return;
          }
          saved++;
        }
        setFeedbackMessage(`${saved} decisiones registradas. No se ha enviado ningún mensaje.`);
      } catch {
        setFeedbackMessage(`${saved}/${request.ids.length} decisiones confirmadas; el resto no está confirmado. Recarga antes de repetir.`);
      } finally {
        // A bulk decision is per-row, not globally atomic. Never retry an uncertain request automatically.
        setFeedback(null);
        setSelected(new Set());
        router.refresh();
      }
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
    const actionIds = ids.filter((id) => visibleIds.has(id));
    if (actionIds.length === 0 || isPending) return;
    if (!confirm(`¿Archivar ${actionIds.length} lead${actionIds.length > 1 ? 's' : ''}? Se conservarán su identidad y su historial.`)) return;
    const fd = new FormData();
    fd.set('ids', actionIds.join(','));
    startTransition(async () => {
      await deleteTargetsAction(fd);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of actionIds) next.delete(id);
        return next;
      });
    });
  };

  const handleBulkStatus = (status: string): void => {
    const parsed = updateTargetStatusSchema.shape.status.safeParse(status);
    if (selectedIds.length === 0 || !parsed.success) return;
    setFeedbackMessage(null);
    setFeedback({ ids: selectedIds, status: parsed.data });
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
    const rows = filtered.filter((t) => selectedIds.length === 0 || selected.has(t.id));
    exportTargetsCSV(rows);
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
        totalCount={statusFilter === 'descartado' ? statusCounts.descartado : statusCounts.todos}
        csvInputRef={csvInputRef}
        handleImportCSV={handleImportCSV}
        isPending={isPending}
        exportCSV={exportCSV}
      />

      {statusFilter === 'descartado' && <p className="text-xs text-sp-admin-muted">
        Archivo recuperable: conserva identidad e historial. Sin motivo y evidencia nueva comparable no hay reapertura automática; las objeciones comerciales requieren revisión manual.
      </p>}

      {feedbackMessage && <p role="status" className="text-xs text-sp-admin-muted">{feedbackMessage}</p>}
      {feedback && feedbackIds.length > 0 && <CreatorFeedbackForm
        key={`${feedback.status}:${feedbackIds.join(',')}`} targetIds={feedbackIds} status={feedback.status}
        pending={isPending} onSave={saveFeedback} onCancel={() => setFeedback(null)}
      />}

      {importResult && (
        <ImportResultBanner
          importResult={importResult}
          onClose={() => setImportResult(null)}
        />
      )}

      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedSize={selectedIds.length}
          brands={brands}
          brandUserId={brandUserId}
          setBrandUserId={setBrandUserId}
          handleAssignToBrand={handleAssignToBrand}
          isPending={isPending}
          selectedIds={selectedIds}
          handleDelete={handleDelete}
          handleBulkStatus={handleBulkStatus}
          clearSelection={() => setSelected(new Set())}
        />
      )}

      {openStatusMenu !== null && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenStatusMenu(null)} />
      )}

      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[1080px]">
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
                <td colSpan={11} className="px-5 py-16 text-center text-sp-admin-muted text-sm">
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
