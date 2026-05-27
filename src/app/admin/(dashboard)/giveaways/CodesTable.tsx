'use client';

import { useState } from 'react';
import { EditCodeModal } from './EditCodeModal';
import { deleteCodeAction, setCodeFeaturedAction } from './codes-actions';
import { DeleteConfirmButton } from './DeleteConfirmButton';
import type { BrandCatalogEntry } from './brand-actions';
import type { CreatorCodeWithTalent } from '@/types';

type Talent = { readonly id: number; readonly name: string };

type Props = {
  readonly codes:        readonly CreatorCodeWithTalent[];
  readonly talents:      readonly Talent[];
  readonly brandCatalog?: readonly BrandCatalogEntry[];
};

export function CodesTable({ codes, talents, brandCatalog = [] }: Props): React.ReactElement {
  const [editing, setEditing] = useState<CreatorCodeWithTalent | null>(null);

  if (codes.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-sm text-sp-admin-muted">No hay códigos. Crea el primero.</p>
        <a href="#crear-codigo" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sp-admin-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          + Crear código
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
        <div className="px-6 py-3 border-b border-sp-admin-border bg-sp-admin-bg/50 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-sp-admin-muted uppercase tracking-wider">{codes.length} código{codes.length !== 1 ? 's' : ''}</span>
          <a
            href="#crear-codigo"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-sp-admin-accent hover:opacity-70 transition-opacity"
          >
            + Añadir código
          </a>
        </div>
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
                <td className="px-4 py-4 text-center">
                  <form action={setCodeFeaturedAction.bind(null, c.id, !c.isFeatured)}>
                    <button type="submit" title={c.isFeatured ? 'Quitar destacado' : 'Marcar como destacado'}>
                      <div className={`w-8 h-4 rounded-full relative transition-colors mx-auto ${c.isFeatured ? 'bg-sp-orange' : 'bg-sp-admin-border'}`}>
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${c.isFeatured ? 'left-4' : 'left-0.5'}`} />
                      </div>
                    </button>
                  </form>
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
                    <a
                      href="#crear-codigo"
                      className="text-emerald-600 hover:opacity-70 text-xs font-bold transition-opacity"
                      title={`Añadir otro código para ${c.talent.name}`}
                    >
                      + Añadir
                    </a>
                    <DeleteConfirmButton
                      action={deleteCodeAction}
                      fields={{ id: c.id, talentSlug: c.talent.slug }}
                      label={c.code}
                    />
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
          brandCatalog={brandCatalog}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
