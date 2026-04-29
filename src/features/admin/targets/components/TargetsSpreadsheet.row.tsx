'use client';

import Image from 'next/image';
import type { Target } from '@/types';
import { formatCompact } from '@/lib/utils/format';
import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  STATUS_COLORS,
  STATUS_TEXT_COLORS,
  STATUS_LABELS,
  STATUS_VALUES,
} from './targets-constants';
import type { StatusValue } from './targets-constants';
import { BATCH_LABELS } from './TargetsSpreadsheet.parts';

type TargetRowProps = Readonly<{
  target: Target;
  index: number;
  selected: Set<number>;
  toggleOne: (id: number) => void;
  openStatusMenu: number | null;
  setOpenStatusMenu: React.Dispatch<React.SetStateAction<number | null>>;
  editingNotes: number | null;
  setEditingNotes: React.Dispatch<React.SetStateAction<number | null>>;
  notesValue: string;
  setNotesValue: (v: string) => void;
  setStatus: (id: number, status: StatusValue) => void;
  saveNotes: (id: number) => void;
  handleDelete: (ids: number[]) => void;
  isPending: boolean;
}>;

export function TargetRow({
  target,
  index,
  selected,
  toggleOne,
  openStatusMenu,
  setOpenStatusMenu,
  editingNotes,
  setEditingNotes,
  notesValue,
  setNotesValue,
  setStatus,
  saveNotes,
  handleDelete,
  isPending,
}: TargetRowProps): React.ReactElement {
  const isEditingNotes = editingNotes === target.id;
  return (
    <tr
      className={`transition-colors hover:bg-sp-admin-hover group ${selected.has(target.id) ? 'bg-sp-admin-accent/5' : ''} ${target.status === 'descartado' ? 'opacity-40' : ''}`}
    >
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={selected.has(target.id)}
          onChange={() => toggleOne(target.id)}
          className="rounded border-sp-admin-border bg-sp-admin-bg accent-sp-admin-accent"
        />
      </td>
      <td className="px-3 py-2.5 text-center text-[11px] text-sp-admin-muted tabular-nums">
        {index + 1}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          {target.profilePicUrl ? (
            <Image
              src={target.profilePicUrl}
              alt={target.username}
              width={28}
              height={28}
              className="w-7 h-7 rounded-full object-cover shrink-0 bg-sp-admin-border"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ backgroundColor: PLATFORM_COLORS[target.platform] }}
            >
              {PLATFORM_LABELS[target.platform]}
            </div>
          )}
          <div className="min-w-0">
            <a
              href={target.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[13px] text-sp-admin-text hover:text-sp-admin-accent transition-colors flex items-center gap-1"
            >
              {target.username}
              <svg aria-hidden="true" className="w-2.5 h-2.5 opacity-40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            {target.fullName && (
              <p className="text-[11px] text-sp-admin-muted truncate max-w-[160px]">
                {target.fullName}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right text-[12px] font-semibold text-sp-admin-text tabular-nums">
        {target.followers > 0 ? formatCompact(target.followers) : '--'}
      </td>
      <td className="px-4 py-2.5 max-w-[240px]">
        {target.bio ? (
          <p className="text-[11px] text-sp-admin-muted line-clamp-2 leading-relaxed">
            {target.bio}
          </p>
        ) : (
          <span className="text-sp-admin-muted/25 text-[11px]">&mdash;</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {target.importBatchId ? (
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
            target.importBatchId.includes('cs2')
              ? 'bg-orange-900/30 text-orange-400'
              : 'bg-blue-900/20 text-blue-400'
          }`}>
            {BATCH_LABELS[target.importBatchId] ?? target.importBatchId}
          </span>
        ) : (
          <span className="text-sp-admin-muted/25 text-[11px]">&mdash;</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => { setEditingNotes(null); setOpenStatusMenu(openStatusMenu === target.id ? null : target.id); }}
            disabled={isPending}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-opacity hover:opacity-80 disabled:cursor-not-allowed ${STATUS_COLORS[target.status]}`}
          >
            {STATUS_LABELS[target.status]}
            <svg aria-hidden="true" className="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {openStatusMenu === target.id && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] bg-sp-admin-card border border-sp-admin-border rounded-lg shadow-xl py-1">
              {STATUS_VALUES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatus(target.id, s); setOpenStatusMenu(null); }}
                  disabled={s === target.status}
                  className={`w-full text-left px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-sp-admin-hover disabled:opacity-40 disabled:cursor-default ${STATUS_TEXT_COLORS[s]}`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5">
        {isEditingNotes ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveNotes(target.id);
                if (e.key === 'Escape') setEditingNotes(null);
              }}
              className="flex-1 bg-sp-admin-bg rounded px-2 py-1 text-xs text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-admin-accent/40 min-w-0"
            />
            <button type="button" onClick={() => saveNotes(target.id)} className="text-[10px] font-semibold text-sp-admin-accent hover:opacity-80">{'\u2713'}</button>
            <button type="button" onClick={() => setEditingNotes(null)} className="text-[10px] text-sp-admin-muted hover:text-sp-admin-text">{'\u2715'}</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setOpenStatusMenu(null); setEditingNotes(target.id); setNotesValue(target.notes ?? ''); }}
            className="text-[11px] text-sp-admin-muted hover:text-sp-admin-text transition-colors text-left w-full max-w-[200px] truncate"
            title={target.notes ?? 'A\u00f1adir nota...'}
          >
            {target.notes || <span className="opacity-25 italic">nota...</span>}
          </button>
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        <button
          type="button"
          onClick={() => handleDelete([target.id])}
          disabled={isPending}
          aria-label="Eliminar"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
        >
          <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
