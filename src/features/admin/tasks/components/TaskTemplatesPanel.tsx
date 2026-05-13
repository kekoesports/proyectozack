'use client';

import { useState, useTransition } from 'react';
import {
  createWeeklyTemplatesAction,
  createSingleTemplateAction,
  saveTemplateDefinitionAction,
  toggleTemplateActiveAction,
  deleteTemplateDefinitionAction,
} from '@/app/admin/(dashboard)/tareas/actions';
import Link from 'next/link';
import { PriorityBadge }   from './PriorityBadge';
import { RecurrenceBadge } from './RecurrenceBadge';
import { CRM_TASK_RECURRENCES, CRM_TASK_RECURRENCE_LABELS } from '@/lib/schemas/taskTemplate';
import type { CrmTask, CrmTaskTemplate, CrmTaskRecurrence } from '@/types';

type Props = {
  readonly templates: readonly CrmTaskTemplate[];
  readonly tasks:     readonly CrmTask[];
  readonly weekLabel: string;
};

const CATEGORIES = [
  'Operativo', 'Revenue', 'CM', 'Gestoría', 'Scouting',
  'Growth', 'Legal', 'Facturación', 'Marca', 'Influencer', 'General',
];

const INPUT = 'rounded-lg border border-sp-admin-border bg-white px-2.5 py-1.5 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const BTN_P = 'h-7 px-3 rounded-lg bg-sp-admin-accent text-white text-[11px] font-bold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors';
const BTN_G = 'h-7 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover disabled:opacity-50 transition-colors';

// ── TemplateForm ──────────────────────────────────────────────────────────────

function TemplateForm({
  template,
  onSave,
  onCancel,
}: {
  readonly template?: CrmTaskTemplate | undefined;
  readonly onSave: (title: string, category: string, priority: 'alta' | 'media' | 'baja', recurrence: CrmTaskRecurrence) => void;
  readonly onCancel: () => void;
}): React.ReactElement {
  const [title,      setTitle]      = useState(template?.title             ?? '');
  const [category,   setCategory]   = useState(template?.category          ?? 'Operativo');
  const [priority,   setPriority]   = useState<'alta' | 'media' | 'baja'>(template?.defaultPriority ?? 'media');
  const [recurrence, setRecurrence] = useState<CrmTaskRecurrence>(template?.recurrence ?? 'weekly');

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-sp-admin-hover/30 border-b border-sp-admin-border/60">
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
      <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as CrmTaskRecurrence)} className={`${INPUT} w-28`}>
        {CRM_TASK_RECURRENCES.map((r) => (
          <option key={r} value={r}>{CRM_TASK_RECURRENCE_LABELS[r]}</option>
        ))}
      </select>
      <button type="button" onClick={() => title.trim() && onSave(title.trim(), category, priority, recurrence)} className={BTN_P}>
        Guardar
      </button>
      <button type="button" onClick={onCancel} className={BTN_G}>
        Cancelar
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TaskTemplatesPanel({ templates, tasks, weekLabel }: Props): React.ReactElement {
  const [open,        setOpen]       = useState(false);
  const [editingId,   setEditingId]  = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [msg,         setMsg]        = useState<string | null>(null);

  const [allPending,    startAll]    = useTransition();
  const [singlePending, startSingle] = useTransition();
  const [,              startSave]   = useTransition();

  const existingTitles = new Set(tasks.map((t) => t.title));
  const active  = templates.filter((t) => t.active);
  const created = active.filter((t) => existingTitles.has(t.title)).length;
  const missing = active.filter((t) => !existingTitles.has(t.title));
  const pct     = active.length > 0 ? Math.round((created / active.length) * 100) : 0;

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

  const handleSave = (id: number | null, title: string, category: string, priority: 'alta' | 'media' | 'baja', _recurrence: CrmTaskRecurrence): void => {
    startSave(async () => {
      const r = await saveTemplateDefinitionAction(id, { title, category, priority });
      if (r.error) flash(`✕ ${r.error}`);
      else {
        flash(id ? '✓ Plantilla actualizada' : '✓ Plantilla añadida');
        setEditingId(null);
        setShowAddForm(false);
      }
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

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2.5 flex-1 text-left">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden
            className="text-sp-admin-muted shrink-0">
            <rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/>
            <rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/>
          </svg>
          <span className="text-[12px] font-bold text-sp-admin-text">Plantillas semanales</span>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-sp-admin-border overflow-hidden hidden sm:block">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : pct > 50 ? '#f59e0b' : '#f5632a' }}
              />
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
              pct === 100
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {created}/{active.length}
            </span>
          </div>

          {missing.length > 0 && (
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
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
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleAll(); }}
              disabled={allPending}
              className={BTN_P}
            >
              {allPending ? 'Creando…' : `+ Crear las ${missing.length} que faltan`}
            </button>
          )}
          <Link
            href="/admin/tareas/plantillas"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text hover:border-sp-admin-accent/40 transition-colors"
            aria-label="Editar plantillas — añadir o quitar tareas"
            title="Editar plantillas — añadir o quitar tareas"
          >
            Editar plantillas
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-6 h-6 flex items-center justify-center rounded text-sp-admin-muted hover:text-sp-admin-text transition-colors text-[12px]"
            aria-label={open ? 'Colapsar plantillas' : 'Expandir plantillas'}
          >
            {open ? '▴' : '▾'}
          </button>
        </div>
      </div>

      {/* ── Lista expandida ──────────────────────────────────────────── */}
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
                    onSave={(t, c, p, r) => handleSave(tpl.id, t, c, p, r)}
                    onCancel={() => setEditingId(null)}
                  />
                );
              }

              return (
                <div
                  key={tpl.id}
                  className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors group/trow hover:bg-sp-admin-hover/30 ${!tpl.active ? 'opacity-40' : ''}`}
                >
                  {/* Toggle activa */}
                  <input
                    type="checkbox"
                    checked={tpl.active}
                    onChange={() => handleToggle(tpl.id, tpl.active)}
                    className="rounded accent-sp-admin-accent cursor-pointer shrink-0"
                    title={tpl.active ? 'Desactivar plantilla' : 'Activar plantilla'}
                  />

                  {/* Estado creada/no-creada */}
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
                    isCreated
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-sp-admin-border text-sp-admin-muted'
                  }`}>
                    {isCreated ? '✓' : '○'}
                  </span>

                  {/* Título */}
                  <p className={`flex-1 text-[12px] font-medium min-w-0 truncate ${
                    isCreated ? 'text-sp-admin-muted line-through' : 'text-sp-admin-text'
                  }`}>
                    {tpl.title}
                  </p>

                  {/* Categoría */}
                  <span className="text-[10px] text-sp-admin-muted hidden sm:inline shrink-0">{tpl.category}</span>

                  {/* Recurrencia */}
                  <div className="hidden md:block shrink-0">
                    <RecurrenceBadge frequency={tpl.recurrence} />
                  </div>

                  {/* Prioridad */}
                  <div className="hidden lg:block shrink-0">
                    <PriorityBadge priority={tpl.defaultPriority} />
                  </div>

                  {/* Acciones (aparecen al hover) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover/trow:opacity-100 transition-opacity shrink-0">
                    {!isCreated && (
                      <button
                        type="button"
                        onClick={() => handleCreate(tpl.id)}
                        disabled={singlePending}
                        className="h-6 px-2 rounded text-[10px] font-bold text-sp-admin-accent border border-sp-admin-accent/40 hover:bg-sp-admin-accent hover:text-white disabled:opacity-40 transition-colors"
                      >
                        + Crear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingId(tpl.id)}
                      className="h-6 px-2 rounded text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover border border-sp-admin-border transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tpl.id, tpl.title)}
                      className="h-6 px-2 rounded text-[10px] font-semibold text-red-400 hover:bg-red-50 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Añadir nueva */}
            {showAddForm ? (
              <TemplateForm
                onSave={(t, c, p, r) => handleSave(null, t, c, p, r)}
                onCancel={() => setShowAddForm(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent hover:bg-sp-admin-hover/30 transition-colors border-t border-dashed border-sp-admin-border/60"
              >
                <span className="text-base leading-none">+</span>
                Añadir plantilla personalizada
              </button>
            )}
          </div>

          <div className="px-4 py-2 border-t border-sp-admin-border/40 flex items-center justify-between">
            <p className="text-[9px] text-sp-admin-muted/60">
              Semana {weekLabel} · Plantillas desactivadas no se crean con &ldquo;Crear todas&rdquo; · No se duplican
            </p>
            <Link
              href="/admin/tareas/plantillas"
              className="text-[10px] font-semibold text-sp-admin-accent hover:underline"
            >
              Gestionar todas →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
