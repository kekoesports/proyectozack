'use client';

import { useState, useTransition } from 'react';
import {
  createWeeklyTemplatesAction,
  createSingleTemplateAction,
  saveTemplateDefinitionAction,
  toggleTemplateActiveAction,
  deleteTemplateDefinitionAction,
} from '@/app/admin/(dashboard)/tareas/actions';
import { PriorityBadge } from './PriorityBadge';
import type { CrmTask, CrmTaskTemplate } from '@/types';

type Props = {
  readonly templates: readonly CrmTaskTemplate[];
  readonly tasks:     readonly CrmTask[];
  readonly weekLabel: string;
};

const CATEGORIES = ['Operativo', 'Revenue', 'CM', 'Gestoría', 'Scouting', 'Growth', 'Legal', 'Facturación', 'Marca', 'Influencer', 'General'];

const INPUT = 'rounded-lg border border-sp-admin-border bg-white px-2.5 py-1.5 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const BTN_P = 'h-7 px-3 rounded-lg bg-sp-admin-accent text-white text-[11px] font-bold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors';
const BTN_G = 'h-7 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover disabled:opacity-50 transition-colors';

function TemplateForm({
  template,
  onSave,
  onCancel,
}: {
  readonly template?: CrmTaskTemplate | undefined;
  readonly onSave: (title: string, category: string, priority: 'alta' | 'media' | 'baja') => void;
  readonly onCancel: () => void;
}): React.ReactElement {
  const [title,    setTitle]    = useState(template?.title    ?? '');
  const [category, setCategory] = useState(template?.category ?? 'Operativo');
  const [priority, setPriority] = useState<'alta' | 'media' | 'baja'>(template?.defaultPriority ?? 'media');

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-sp-admin-hover/30 border-b border-sp-admin-border/60">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la plantilla…"
        className={`${INPUT} flex-1 min-w-[200px]`}
        autoFocus
      />
      <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${INPUT} w-32`}>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={priority} onChange={(e) => setPriority(e.target.value as 'alta' | 'media' | 'baja')} className={`${INPUT} w-24`}>
        <option value="alta">Alta</option>
        <option value="media">Media</option>
        <option value="baja">Baja</option>
      </select>
      <button type="button" onClick={() => title.trim() && onSave(title.trim(), category, priority)} className={BTN_P}>
        Guardar
      </button>
      <button type="button" onClick={onCancel} className={BTN_G}>
        Cancelar
      </button>
    </div>
  );
}

export function TaskTemplatesPanel({ templates, tasks, weekLabel }: Props): React.ReactElement {
  const [open,       setOpen]       = useState(false);
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [msg,        setMsg]        = useState<string | null>(null);

  const [allPending,    startAll]    = useTransition();
  const [singlePending, startSingle] = useTransition();
  const [,              startSave]   = useTransition();

  const existingTitles = new Set(tasks.map((t) => t.title));
  const active   = templates.filter((t) => t.active);
  const created  = active.filter((t) => existingTitles.has(t.title)).length;
  const missing  = active.filter((t) => !existingTitles.has(t.title));

  function flash(text: string): void {
    setMsg(text);
    setTimeout(() => setMsg(null), 3500);
  }

  const handleAll = (): void => {
    startAll(async () => {
      const r = await createWeeklyTemplatesAction();
      flash(`✓ ${r.created} creadas · ${r.skipped} ya existían`);
    });
  };

  const handleCreate = (id: number): void => {
    startSingle(async () => {
      const r = await createSingleTemplateAction(id);
      if (r.error) flash(`✕ ${r.error}`);
      else flash('✓ Tarea creada');
    });
  };

  const handleSave = (id: number | null, title: string, category: string, priority: 'alta' | 'media' | 'baja'): void => {
    startSave(async () => {
      const r = await saveTemplateDefinitionAction(id, { title, category, priority });
      if (r.error) flash(`✕ ${r.error}`);
      else { flash(id ? '✓ Plantilla actualizada' : '✓ Plantilla añadida'); setEditingId(null); setShowAddForm(false); }
    });
  };

  const handleToggle = (id: number, isActive: boolean): void => {
    startSave(async () => { await toggleTemplateActiveAction(id, !isActive); });
  };

  const handleDelete = (id: number, title: string): void => {
    if (!confirm(`¿Eliminar la plantilla "${title}"? Esta acción no se puede deshacer.`)) return;
    startSave(async () => {
      await deleteTemplateDefinitionAction(id);
      flash('Plantilla eliminada');
    });
  };

  return (
    <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 flex-1 text-left">
          <span className="text-[11px] font-bold text-sp-admin-text">Plantillas semanales</span>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {created}/{active.length} creadas
          </span>
          {missing.length > 0 && (
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {missing.length} pendientes
            </span>
          )}
          {msg && (
            <span className={`text-[11px] font-semibold ml-1 ${msg.startsWith('✕') ? 'text-red-500' : 'text-emerald-600'}`}>
              {msg}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {missing.length > 0 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); handleAll(); }} disabled={allPending}
              className={BTN_P}>
              {allPending ? 'Creando…' : `+ Crear las ${missing.length} que faltan`}
            </button>
          )}
          <button type="button" onClick={() => { setOpen((v) => !v); }}
            className="text-sp-admin-muted text-[11px] hover:text-sp-admin-text transition-colors">
            {open ? '▴' : '▾'}
          </button>
        </div>
      </div>

      {/* Lista expandida */}
      {open && (
        <>
          <div className="border-t border-sp-admin-border/60 divide-y divide-sp-admin-border/30">
            {templates.map((tpl) => {
              const isCreated = existingTitles.has(tpl.title);
              if (editingId === tpl.id) {
                return (
                  <TemplateForm
                    key={tpl.id}
                    template={tpl}
                    onSave={(t, c, p) => handleSave(tpl.id, t, c, p)}
                    onCancel={() => setEditingId(null)}
                  />
                );
              }
              return (
                <div key={tpl.id}
                  className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors group/trow ${!tpl.active ? 'opacity-40' : ''} hover:bg-sp-admin-hover/30`}>
                  {/* Toggle activa */}
                  <input type="checkbox" checked={tpl.active} onChange={() => handleToggle(tpl.id, tpl.active)}
                    className="rounded accent-sp-admin-accent cursor-pointer shrink-0"
                    title={tpl.active ? 'Desactivar plantilla' : 'Activar plantilla'} />
                  {/* Estado creada/no-creada */}
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
                    isCreated ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-sp-admin-border text-sp-admin-muted'
                  }`}>
                    {isCreated ? '✓' : '○'}
                  </span>
                  {/* Título */}
                  <p className={`flex-1 text-[12px] font-medium min-w-0 truncate ${isCreated ? 'text-sp-admin-muted line-through' : 'text-sp-admin-text'}`}>
                    {tpl.title}
                  </p>
                  {/* Categoría */}
                  <span className="text-[10px] text-sp-admin-muted hidden sm:inline shrink-0">{tpl.category}</span>
                  {/* Prioridad */}
                  <div className="hidden md:block shrink-0"><PriorityBadge priority={tpl.defaultPriority} /></div>
                  {/* Acciones (aparecen al hover) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover/trow:opacity-100 transition-opacity shrink-0">
                    {!isCreated && (
                      <button type="button" onClick={() => handleCreate(tpl.id)} disabled={singlePending}
                        className="h-6 px-2 rounded text-[10px] font-bold text-sp-admin-accent border border-sp-admin-accent/40 hover:bg-sp-admin-accent hover:text-white disabled:opacity-40 transition-colors">
                        + Crear
                      </button>
                    )}
                    <button type="button" onClick={() => setEditingId(tpl.id)}
                      className="h-6 px-2 rounded text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover border border-sp-admin-border transition-colors">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(tpl.id, tpl.title)}
                      className="h-6 px-2 rounded text-[10px] font-semibold text-red-400 hover:bg-red-50 transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Formulario añadir nueva */}
            {showAddForm ? (
              <TemplateForm
                onSave={(t, c, p) => handleSave(null, t, c, p)}
                onCancel={() => setShowAddForm(false)}
              />
            ) : (
              <button type="button" onClick={() => setShowAddForm(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent hover:bg-sp-admin-hover/30 transition-colors border-t border-dashed border-sp-admin-border/60">
                <span className="text-lg leading-none">+</span>
                Añadir plantilla personalizada
              </button>
            )}
          </div>

          <p className="px-4 py-2 text-[9px] text-sp-admin-muted/60 border-t border-sp-admin-border/40">
            Semana {weekLabel} · Las plantillas desactivadas no se crean con &ldquo;Crear todas&rdquo; · Las creadas no se duplican
          </p>
        </>
      )}
    </div>
  );
}
