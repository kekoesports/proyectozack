'use client';

import { useActionState, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createTemplateAction,
  updateTemplateAction,
  toggleTemplateActiveAction,
  deleteTemplateAction,
  seedDefaultTemplatesAction,
} from '@/app/admin/(dashboard)/campanas/plantillas/actions';
import { AVAILABLE_VARIABLES, TEMPLATE_TYPES } from '@/lib/contractVariables';
import type { ContractTemplate } from '@/lib/queries/contractTemplates';

// ── Estilos ───────────────────────────────────────────────────────────

const I   = 'w-full rounded-lg border border-sp-admin-border bg-white px-3 py-2 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const TA  = `${I} resize-none font-mono text-[11px]`;
const LB  = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';

// ── Tipo label ────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }): React.ReactElement {
  const cfg = TEMPLATE_TYPES.find((t) => t.value === type);
  const colors: Record<string, string> = {
    casino:     'bg-red-50 text-red-700 border-red-200',
    cs2_cases:  'bg-yellow-50 text-yellow-700 border-yellow-200',
    marketplace: 'bg-orange-50 text-orange-700 border-orange-200',
    youtube:    'bg-red-50 text-red-600 border-red-200',
    twitch:     'bg-purple-50 text-purple-700 border-purple-200',
    instagram:  'bg-pink-50 text-pink-700 border-pink-200',
    sports_bet: 'bg-green-50 text-green-700 border-green-200',
    general:    'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${colors[type] ?? colors.general}`}>
      {cfg?.label ?? type}
    </span>
  );
}

// ── Editor de plantilla ───────────────────────────────────────────────

function TemplateEditor({
  template,
  onClose,
  mode,
}: {
  readonly template?: ContractTemplate | undefined;
  readonly onClose:   () => void;
  readonly mode:      'create' | 'edit';
}): React.ReactElement {
  const action = mode === 'create' ? createTemplateAction : updateTemplateAction;
  const [state, formAction, isPending] = useActionState(action, {});

  const [content, setContent] = useState(template?.content ?? '');
  const [search,  setSearch]  = useState('');

  if (state.success && !isPending) setTimeout(onClose, 0);

  const filteredVars = useMemo(() =>
    AVAILABLE_VARIABLES.filter((v) =>
      v.key.includes(search.toLowerCase()) || v.label.toLowerCase().includes(search.toLowerCase()),
    ),
  [search]);

  function insertVariable(key: string): void {
    setContent((prev) => `${prev}{{${key}}}`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-sp-admin-card rounded-xl shadow-2xl w-full max-w-5xl my-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-admin-border sticky top-0 bg-sp-admin-card z-10 rounded-t-xl">
          <h2 className="text-[15px] font-bold text-sp-admin-text">
            {mode === 'create' ? 'Nueva plantilla' : `Editar: ${template?.name}`}
          </h2>
          <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-xl leading-none">×</button>
        </div>

        <form action={formAction} className="flex gap-0 h-[70vh]">
          {mode === 'edit' && template && <input type="hidden" name="id" value={template.id} />}
          <input type="hidden" name="content" value={content} />

          {/* Panel izquierdo: meta + editor */}
          <div className="flex-1 flex flex-col border-r border-sp-admin-border">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 px-5 py-4 border-b border-sp-admin-border/60">
              <div>
                <label className={LB}>Nombre *</label>
                <input name="name" required defaultValue={template?.name ?? ''} placeholder="Contrato Casino — Tier 1 LATAM" className={I} />
              </div>
              <div>
                <label className={LB}>Tipo de campaña</label>
                <select name="type" defaultValue={template?.type ?? 'general'} className={I}>
                  {TEMPLATE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Editor de texto */}
            <div className="flex-1 px-5 py-3 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className={LB}>Contenido de la plantilla *</label>
                <span className="text-[9px] text-sp-admin-muted/60">
                  Usa <code className="font-mono bg-sp-admin-hover px-1 rounded">{`{{variable}}`}</code> para insertar datos del trato
                </span>
              </div>
              <textarea
                name="_content_display"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                placeholder="Escribe el contenido del contrato aquí…&#10;&#10;Usa {{brand_name}}, {{influencer_name}}, {{total_amount}}, etc."
                className={`${TA} flex-1`}
              />
            </div>
          </div>

          {/* Panel derecho: variables */}
          <div className="w-60 flex flex-col bg-sp-admin-hover/20">
            <div className="px-4 py-3 border-b border-sp-admin-border/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted mb-2">Variables disponibles</p>
              <input
                type="search"
                placeholder="Buscar variable…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${I} h-7 text-[11px]`}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {filteredVars.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-sp-admin-hover transition-colors group"
                  title={`Insertar {{${v.key}}}`}
                >
                  <p className="text-[10px] font-mono font-semibold text-sp-admin-accent group-hover:text-sp-admin-accent/80">
                    {`{{${v.key}}}`}
                  </p>
                  <p className="text-[9px] text-sp-admin-muted truncate">{v.label}</p>
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-sp-admin-border">
          {state.error && <p className="text-[12px] text-red-500">{state.error}</p>}
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="h-9 px-4 rounded-lg border border-sp-admin-border text-[12px] text-sp-admin-muted hover:bg-sp-admin-hover transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              form=""
              disabled={isPending}
              onClick={() => {
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }}
              className="h-9 px-5 rounded-lg bg-sp-admin-accent text-white text-[12px] font-bold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Guardando…' : mode === 'create' ? 'Crear plantilla' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────

type Props = { readonly templates: readonly ContractTemplate[] };

export function ContractTemplatesManager({ templates }: Props): React.ReactElement {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing,   setEditing]   = useState<ContractTemplate | null>(null);
  const [creating,  setCreating]  = useState(false);
  const [seeding,   setSeeding]   = useState(false);
  const [seedMsg,   setSeedMsg]   = useState('');

  // Agrupar por tipo
  const grouped = useMemo(() => {
    const map = new Map<string, ContractTemplate[]>();
    for (const t of templates) {
      const list = map.get(t.type) ?? [];
      list.push(t);
      map.set(t.type, list);
    }
    return map;
  }, [templates]);

  function handleToggle(id: number, current: boolean): void {
    startTransition(async () => {
      await toggleTemplateActiveAction(id, !current);
      router.refresh();
    });
  }

  function handleDelete(t: ContractTemplate): void {
    if (!confirm(`¿Eliminar la plantilla "${t.name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      await deleteTemplateAction(t.id);
      router.refresh();
    });
  }

  function handleSeed(): void {
    if (!confirm('¿Importar las 6 plantillas predefinidas (General, Casino, CS2, Marketplace, YouTube, Twitch)? Se añadirán a las existentes.')) return;
    setSeeding(true);
    setSeedMsg('');
    startTransition(async () => {
      const res = await seedDefaultTemplatesAction();
      if (res.success) {
        setSeedMsg(`✓ ${res.id} plantillas importadas correctamente`);
        router.refresh();
      } else {
        setSeedMsg(`✕ ${res.error ?? 'Error'}`);
      }
      setSeeding(false);
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/admin/campanas" className="text-[11px] text-sp-admin-muted hover:text-sp-admin-accent transition-colors">
              ← Tratos
            </Link>
          </div>
          <h1 className="text-xl font-bold text-sp-admin-text leading-none">Plantillas de contratos</h1>
          <p className="text-[11px] text-sp-admin-muted mt-1">
            {templates.length} plantillas · gestiona los modelos reutilizables para generar contratos desde los tratos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {templates.length === 0 && (
            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding}
              className="h-9 px-4 rounded-lg border border-sp-admin-border text-[12px] font-semibold text-sp-admin-muted hover:bg-sp-admin-hover disabled:opacity-50 transition-colors"
            >
              {seeding ? 'Importando…' : '📥 Importar plantillas predefinidas'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Nueva plantilla
          </button>
        </div>
      </div>

      {/* Feedback seed */}
      {seedMsg && (
        <div className={`rounded-xl border px-4 py-2.5 text-[12px] font-medium ${
          seedMsg.startsWith('✓') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {seedMsg}
        </div>
      )}

      {/* Banner importar si hay pocas plantillas */}
      {templates.length > 0 && templates.length < 3 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-blue-500 text-[15px]" aria-hidden>💡</span>
          <div className="flex-1">
            <p className="text-[12px] text-blue-800 font-medium">
              Importa las plantillas predefinidas para Casino, CS2, Marketplace, YouTube y Twitch con un clic.
            </p>
          </div>
          <button type="button" onClick={handleSeed} disabled={seeding}
            className="h-7 px-3 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0">
            {seeding ? '…' : 'Importar'}
          </button>
        </div>
      )}

      {/* Vacío */}
      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-10 text-center">
          <p className="text-[15px] font-bold text-sp-admin-text mb-1">Sin plantillas todavía</p>
          <p className="text-[12px] text-sp-admin-muted mb-4">
            Importa las plantillas predefinidas (Casino, CS2, YouTube, Twitch…) o crea una desde cero.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={handleSeed} disabled={seeding}
              className="h-9 px-4 rounded-lg border border-sp-admin-border text-[12px] font-semibold text-sp-admin-muted hover:bg-sp-admin-hover disabled:opacity-50 transition-colors">
              {seeding ? 'Importando…' : '📥 Importar predefinidas (Casino, CS2, YouTube…)'}
            </button>
            <button type="button" onClick={() => setCreating(true)}
              className="h-9 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors">
              + Crear desde cero
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {TEMPLATE_TYPES.map(({ value: typeKey }) => {
            const list = grouped.get(typeKey);
            if (!list?.length) return null;
            return (
              <div key={typeKey}>
                <div className="flex items-center gap-2 mb-2">
                  <TypeBadge type={typeKey} />
                  <span className="text-[10px] text-sp-admin-muted">{list.length} plantilla{list.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
                  {list.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-sp-admin-border/40 last:border-0 transition-colors group hover:bg-sp-admin-hover/20 ${!tpl.isActive ? 'opacity-50' : ''}`}
                    >
                      {/* Toggle activa */}
                      <input
                        type="checkbox"
                        checked={tpl.isActive}
                        onChange={() => handleToggle(tpl.id, tpl.isActive)}
                        className="rounded accent-sp-admin-accent cursor-pointer shrink-0"
                        title={tpl.isActive ? 'Desactivar' : 'Activar'}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-sp-admin-text truncate">{tpl.name}</p>
                        <p className="text-[10px] text-sp-admin-muted mt-0.5">
                          {tpl.content.length} caracteres · actualizada {new Date(tpl.updatedAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditing(tpl)}
                          className="h-7 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tpl)}
                          className="h-7 px-2 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-50 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Variables disponibles referencia */}
      <details className="group">
        <summary className="cursor-pointer select-none flex items-center gap-2 text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            className="group-open:rotate-90 transition-transform" aria-hidden>
            <path d="M3 1l4 4-4 4"/>
          </svg>
          Variables disponibles para usar en plantillas
        </summary>
        <div className="mt-3 rounded-xl border border-sp-admin-border bg-sp-admin-card px-4 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {AVAILABLE_VARIABLES.map((v) => (
              <div key={v.key} className="rounded-lg bg-sp-admin-hover/40 px-2.5 py-2">
                <p className="text-[10px] font-mono font-bold text-sp-admin-accent">{`{{${v.key}}}`}</p>
                <p className="text-[9px] text-sp-admin-muted">{v.label}</p>
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Modales */}
      {creating && (
        <TemplateEditor mode="create" onClose={() => { setCreating(false); router.refresh(); }} />
      )}
      {editing && (
        <TemplateEditor mode="edit" template={editing} onClose={() => { setEditing(null); router.refresh(); }} />
      )}
    </div>
  );
}
