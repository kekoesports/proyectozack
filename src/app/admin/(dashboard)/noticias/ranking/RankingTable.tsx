'use client';

import { useState } from 'react';
import { updateRankingEntryAction, deleteRankingEntryAction } from './actions';
import type { InferSelectModel } from 'drizzle-orm';
import type { rankingEntries } from '@/db/schema';

type Entry = InferSelectModel<typeof rankingEntries>;

const inputCls = 'rounded-lg border border-sp-admin-border bg-sp-admin-bg px-2.5 py-1.5 text-sm text-sp-admin-text outline-none focus:border-sp-orange/60 transition-colors w-full';

function EditRow({ entry, onCancel }: { readonly entry: Entry; readonly onCancel: () => void }) {
  return (
    <tr className="bg-sp-admin-accent/5 border-b border-sp-admin-border/50">
      <td colSpan={6} className="px-4 py-3">
        <form action={async (fd) => { await updateRankingEntryAction(fd); onCancel(); }}
          className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
          <input type="hidden" name="id" value={entry.id} />
          <div>
            <label className="block text-[10px] font-bold text-sp-admin-muted uppercase mb-1">Pos</label>
            <input name="position" type="number" min={1} max={99} defaultValue={entry.position} required className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-sp-admin-muted uppercase mb-1">Equipo</label>
            <input name="teamName" defaultValue={entry.teamName} required className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-sp-admin-muted uppercase mb-1">País</label>
            <input name="country" maxLength={3} defaultValue={entry.country ?? ''} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-sp-admin-muted uppercase mb-1">Puntos</label>
            <input name="points" type="number" min={0} defaultValue={entry.points} className={inputCls} />
          </div>
          <div className="flex gap-1.5">
            <button type="submit"
              className="flex-1 px-3 py-1.5 rounded-lg bg-sp-orange text-white text-xs font-bold hover:bg-sp-orange/90 transition-colors">
              Guardar
            </button>
            <button type="button" onClick={onCancel}
              className="px-3 py-1.5 rounded-lg border border-sp-admin-border text-xs text-sp-admin-muted hover:bg-sp-admin-hover transition-colors">
              ✕
            </button>
          </div>
          <div className="col-span-2 md:col-span-6">
            <label className="block text-[10px] font-bold text-sp-admin-muted uppercase mb-1">Logo URL</label>
            <input name="teamLogo" type="url" defaultValue={entry.teamLogo ?? ''} className={inputCls} placeholder="https://..." />
          </div>
        </form>
      </td>
    </tr>
  );
}

type Props = { readonly entries: readonly Entry[] };

export function RankingTable({ entries }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);

  if (entries.length === 0) {
    return <p className="text-sm text-sp-admin-muted">No hay equipos. Añade el primero.</p>;
  }

  return (
    <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
            {['Pos', 'Equipo', 'País', 'Puntos', 'Logo', 'Acciones'].map((h) => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <>
              <tr key={e.id}
                className={`border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors ${editingId === e.id ? 'opacity-0 h-0 hidden' : ''}`}>
                <td className="px-4 py-3 font-display font-black text-sp-orange text-lg">{e.position}</td>
                <td className="px-4 py-3 font-semibold text-sp-admin-text">{e.teamName}</td>
                <td className="px-4 py-3 text-sp-admin-muted text-xs uppercase">{e.country ?? '—'}</td>
                <td className="px-4 py-3 text-sp-admin-muted tabular-nums">{e.points.toLocaleString('es-ES')}</td>
                <td className="px-4 py-3">
                  {e.teamLogo
                    ? <img src={e.teamLogo} alt="" className="w-6 h-6 object-contain rounded" /> /* eslint-disable-line @next/next/no-img-element */
                    : <span className="text-sp-admin-muted/40 text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingId(e.id)}
                      className="text-xs font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity">
                      Editar
                    </button>
                    <form action={deleteRankingEntryAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="text-xs font-semibold text-red-400/60 hover:text-red-400 transition-colors">
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
              {editingId === e.id && (
                <EditRow key={`edit-${e.id}`} entry={e} onCancel={() => setEditingId(null)} />
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
