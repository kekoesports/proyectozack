'use client';

import { useState } from 'react';
import { EditCodeModal } from './EditCodeModal';
import { deleteCodeAction } from './codes-actions';
import type { CreatorCodeWithTalent } from '@/types';

type Talent = { readonly id: number; readonly name: string };

type Props = {
  readonly codes:   readonly CreatorCodeWithTalent[];
  readonly talents: readonly Talent[];
};

export function CodesTable({ codes, talents }: Props): React.ReactElement {
  const [editing, setEditing] = useState<CreatorCodeWithTalent | null>(null);

  if (codes.length === 0) {
    return <p className="text-sm text-sp-admin-muted">No hay códigos. Crea el primero.</p>;
  }

  return (
    <>
      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
              <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Código</th>
              <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Creador</th>
              <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Marca</th>
              <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Badge</th>
              <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Categ.</th>
              <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Dest.</th>
              <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-sp-admin-text">{c.code}</td>
                <td className="px-6 py-4 text-sp-admin-muted">{c.talent.name}</td>
                <td className="px-6 py-4 text-sp-admin-muted">{c.brandName}</td>
                <td className="px-6 py-4 text-sp-admin-muted text-xs">{c.badge ?? '—'}</td>
                <td className="px-6 py-4 text-sp-admin-muted text-xs">{c.category ?? '—'}</td>
                <td className="px-6 py-4">
                  {c.isFeatured && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-900/30 text-amber-400">★</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      className="text-sp-admin-accent hover:opacity-70 text-xs font-bold cursor-pointer transition-opacity"
                    >
                      Editar
                    </button>
                    <form action={deleteCodeAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="talentSlug" value={c.talent.slug} />
                      <button type="submit" className="text-red-400 hover:text-red-300 text-xs font-bold cursor-pointer">
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <EditCodeModal
          code={editing}
          talents={talents}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
