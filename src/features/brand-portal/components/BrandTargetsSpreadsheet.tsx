'use client';

import Image from 'next/image';
import { useMemo, useState, useTransition } from 'react';

import { formatCompact } from '@/lib/utils/format';
import type { Target } from '@/types';

import {
  updateBrandTargetNotesAction,
  updateBrandTargetStatusAction,
} from '@/app/marcas/(portal)/targets/actions';

type StatusValue = 'pendiente' | 'contactado' | 'finalizado' | 'descartado';

const STATUS_COLORS: Record<StatusValue, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  contactado: 'bg-blue-100 text-blue-700',
  finalizado: 'bg-emerald-100 text-emerald-700',
  descartado: 'bg-gray-100 text-gray-400',
};

const STATUS_TEXT_COLORS: Record<StatusValue, string> = {
  pendiente: 'text-amber-700',
  contactado: 'text-blue-700',
  finalizado: 'text-emerald-700',
  descartado: 'text-gray-400',
};

const STATUS_VALUES: readonly StatusValue[] = ['pendiente', 'contactado', 'finalizado', 'descartado'] as const;

const STATUS_LABELS: Record<StatusValue, string> = {
  pendiente: 'Pendiente',
  contactado: 'Contactado',
  finalizado: 'Finalizado',
  descartado: 'Descartado',
};

/**
 * Spreadsheet editable de targets de la marca en el portal.
 *
 * @kind client
 * @feature brand-portal
 * @route /marcas/targets
 * @example
 * ```tsx
 * <BrandTargetsSpreadsheet brandId={brandId} initialRows={rows} />
 * ```
 */
export function BrandTargetsSpreadsheet({
  targets,
}: {
  targets: Target[];
}): React.ReactElement {
  const [search, setSearch] = useState('');
  const [openStatusMenu, setOpenStatusMenu] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search.trim()) return targets;
    const q = search.toLowerCase().trim();
    return targets.filter((target) =>
      target.username.toLowerCase().includes(q) ||
      (target.fullName?.toLowerCase().includes(q) ?? false) ||
      (target.bio?.toLowerCase().includes(q) ?? false),
    );
  }, [targets, search]);

  const setStatus = (id: number, status: StatusValue): void => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('targetId', String(id));
      fd.set('status', status);
      await updateBrandTargetStatusAction(fd);
    });
  };

  const saveNotes = (targetId: number): void => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('targetId', String(targetId));
      fd.set('notes', notesValue);
      await updateBrandTargetNotesAction(fd);
      setEditingNotes(null);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filtrar targets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-sp-border bg-white px-4 py-2.5 text-sm text-sp-dark placeholder:text-sp-muted focus:outline-none focus:ring-1 focus:ring-sp-orange/30"
        />
        <span className="text-xs text-sp-muted tabular-nums">
          <span className="font-bold text-sp-dark">{filtered.length}</span>
          {filtered.length !== targets.length && ` de ${targets.length}`} targets
        </span>
      </div>

      <div className="rounded-2xl border border-sp-border bg-sp-off/60 px-4 py-3 text-xs text-sp-muted">
        Usa el desplegable de estado para mover el target por la pipeline y las notas para guardar contexto antes de contactar.
      </div>

      {openStatusMenu !== null && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenStatusMenu(null)} />
      )}

      <div className="rounded-2xl border border-sp-border bg-white overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-sp-border bg-sp-off/60">
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-muted">Perfil</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-muted text-right">Seguidores</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-muted">Bio</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-muted">Fuente</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-muted">Estado</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-muted">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sp-border/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-sm text-sp-muted">
                  Todavia no tienes targets asignados. Cuando el equipo importe perfiles y los asigne a tu marca, apareceran aqui.
                </td>
              </tr>
            ) : (
              filtered.map((target) => {
                const isEditingNotes = editingNotes === target.id;
                return (
                  <tr key={target.id} className="hover:bg-sp-off/60 transition-colors align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {target.profilePicUrl ? (
                          <Image
                            src={target.profilePicUrl}
                            alt={target.username}
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full object-cover bg-sp-border shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-sp-dark text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {target.platform === 'instagram' ? 'In' : 'Yt'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <a
                            href={target.profileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-sp-dark hover:text-sp-orange transition-colors"
                          >
                            {target.platform === 'instagram' ? '@' : ''}
                            {target.username}
                          </a>
                          {target.fullName && (
                            <p className="text-xs text-sp-muted truncate max-w-[220px]">
                              {target.fullName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-sp-dark tabular-nums">
                      {target.followers > 0 ? formatCompact(target.followers) : '--'}
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      {target.bio ? (
                        <p className="text-xs text-sp-muted line-clamp-2 leading-relaxed">{target.bio}</p>
                      ) : (
                        <span className="text-xs text-sp-muted/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-sp-muted">{target.discoveredVia || '--'}</td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setEditingNotes(null); setOpenStatusMenu(openStatusMenu === target.id ? null : target.id); }}
                          disabled={isPending}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80 disabled:cursor-not-allowed ${STATUS_COLORS[target.status]}`}
                        >
                          {STATUS_LABELS[target.status]}
                          <svg aria-hidden="true" className="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        {openStatusMenu === target.id && (
                          <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] bg-white border border-sp-border rounded-xl shadow-xl py-1">
                            {STATUS_VALUES.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => { setStatus(target.id, s); setOpenStatusMenu(null); }}
                                disabled={s === target.status}
                                className={`w-full text-left px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-sp-off disabled:opacity-40 disabled:cursor-default ${STATUS_TEXT_COLORS[s]}`}
                              >
                                {STATUS_LABELS[s]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[220px]">
                      {isEditingNotes ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveNotes(target.id);
                              if (e.key === 'Escape') setEditingNotes(null);
                            }}
                            className="w-full rounded-lg border border-sp-border bg-sp-off px-3 py-2 text-xs text-sp-dark focus:outline-none focus:ring-1 focus:ring-sp-orange/30"
                          />
                          <button type="button" onClick={() => saveNotes(target.id)} className="text-xs font-semibold text-sp-orange">Guardar</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenStatusMenu(null);
                            setEditingNotes(target.id);
                            setNotesValue(target.notes ?? '');
                          }}
                          className="text-xs text-sp-muted hover:text-sp-dark transition-colors text-left max-w-[260px] truncate"
                        >
                          {target.notes || <span className="opacity-40 italic">anadir nota...</span>}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
