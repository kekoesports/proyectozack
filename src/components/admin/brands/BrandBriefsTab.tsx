'use client';

import { useActionState, useState, useTransition } from 'react';
import {
  uploadBriefAction,
  approveBriefAction,
  archiveBriefAction,
  deleteBriefAction,
  updateBriefNotesAction,
} from '@/app/admin/(dashboard)/brands/brief-actions';
import type { BrandBriefWithUser } from '@/types';

type Props = {
  readonly brandId: number;
  readonly briefs:  readonly BrandBriefWithUser[];
  readonly isAdmin: boolean;
};

// ── Status config ─────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending_review: { label: 'Pendiente revisión', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved:       { label: 'Aprobado',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  archived:       { label: 'Archivado',          cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
};

const FALLBACK_STATUS = { label: 'Desconocido', cls: 'bg-slate-100 text-slate-500 border-slate-200' };

function fileIcon(mime: string | null): string {
  if (!mime) return '📄';
  if (mime === 'application/pdf') return '📕';
  if (mime.includes('word')) return '📝';
  if (mime.startsWith('image/')) return '🖼️';
  return '📄';
}

const INPUT = 'w-full rounded-lg border border-sp-admin-border bg-white px-3 py-2 text-[13px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const LABEL = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';

// ── Upload Modal ──────────────────────────────────────────────────────

function UploadModal({ brandId, onClose }: { readonly brandId: number; readonly onClose: () => void }): React.ReactElement {
  const [state, formAction, isPending] = useActionState(uploadBriefAction, {});
  if (state.success && !isPending) setTimeout(onClose, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-sp-admin-card rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-admin-border">
          <h2 className="text-base font-bold text-sp-admin-text">Subir brief</h2>
          <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-xl leading-none">×</button>
        </div>
        <form action={formAction} className="p-6 space-y-4">
          <input type="hidden" name="brandId" value={brandId} />

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={LABEL}>Nombre del brief *</label>
              <input name="name" required placeholder="Brief Q2 2026 — Casino LATAM" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Versión</label>
              <input name="version" defaultValue="v1" placeholder="v1" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>GEO</label>
              <input name="geo" placeholder="LATAM, España, Global…" className={INPUT} />
            </div>
          </div>

          <div>
            <label className={LABEL}>Archivo * (PDF, DOC, DOCX, imagen — máx 20 MB)</label>
            <input
              name="file"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt"
              required
              className={`${INPUT} file:mr-3 file:rounded-full file:border-0 file:bg-sp-admin-hover file:px-3 file:py-1 file:text-xs file:font-semibold file:text-sp-admin-text`}
            />
          </div>

          <div>
            <label className={LABEL}>Notas internas</label>
            <textarea name="notes" rows={2} placeholder="Contexto, instrucciones para el equipo…" className={INPUT} />
          </div>

          {state.error && <p className="text-xs text-red-400 font-medium">{state.error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-sp-admin-border/60">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover border border-sp-admin-border transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors">
              {isPending ? 'Subiendo…' : 'Subir brief'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Detail row / inline notes ─────────────────────────────────────────

function BriefRow({
  brief, brandId, isAdmin,
}: {
  readonly brief:   BrandBriefWithUser;
  readonly brandId: number;
  readonly isAdmin: boolean;
}): React.ReactElement {
  const [expanded,  setExpanded]  = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(brief.notes ?? '');
  const [isPending, startTransition] = useTransition();

  const cfg = STATUS_CFG[brief.status] ?? FALLBACK_STATUS;

  function handleApprove(): void {
    if (!confirm(`¿Aprobar el brief "${brief.name}"?`)) return;
    startTransition(async () => { await approveBriefAction(brief.id, brandId); });
  }
  function handleArchive(): void {
    startTransition(async () => { await archiveBriefAction(brief.id, brandId); });
  }
  function handleDelete(): void {
    if (!confirm(`¿Eliminar "${brief.name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => { await deleteBriefAction(brief.id, brandId); });
  }
  function saveNotes(): void {
    startTransition(async () => {
      await updateBriefNotesAction(brief.id, brandId, notesDraft);
      setEditNotes(false);
    });
  }

  return (
    <>
      <tr
        className={`border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover/40 transition-colors cursor-pointer ${brief.status === 'archived' ? 'opacity-60' : ''}`}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Icono + nombre */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg leading-none shrink-0">{fileIcon(brief.sourceFileMime)}</span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-sp-admin-text truncate">{brief.name}</p>
              {brief.createdByName && (
                <p className="text-[10px] text-sp-admin-muted/60">por {brief.createdByName}</p>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-3 text-[11px] text-sp-admin-muted font-mono">{brief.version}</td>
        <td className="px-3 py-3 text-[11px] text-sp-admin-muted">{brief.geo ?? '—'}</td>
        <td className="px-3 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.cls}`}>
            {cfg.label}
          </span>
        </td>
        <td className="px-3 py-3 text-[11px] text-sp-admin-muted tabular-nums">
          {new Date(brief.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
        </td>
        {/* Acciones */}
        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {brief.sourceFileUrl && (
              <a href={brief.sourceFileUrl} target="_blank" rel="noreferrer"
                className="px-2 py-1 rounded text-[10px] font-semibold text-sp-admin-accent hover:bg-sp-admin-accent/10 transition-colors">
                Ver
              </a>
            )}
            {isAdmin && brief.status === 'pending_review' && (
              <button type="button" onClick={handleApprove} disabled={isPending}
                className="px-2 py-1 rounded text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 transition-colors">
                Aprobar
              </button>
            )}
            {brief.status !== 'archived' && (
              <button type="button" onClick={handleArchive} disabled={isPending}
                className="px-2 py-1 rounded text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
                Archivar
              </button>
            )}
            {isAdmin && (
              <button type="button" onClick={handleDelete} disabled={isPending}
                className="px-2 py-1 rounded text-[10px] font-semibold text-red-400 hover:bg-red-50 disabled:opacity-40 transition-colors">
                ✕
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className="bg-sp-admin-hover/20">
          <td colSpan={6} className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-3 text-[12px]">
              {/* Archivo */}
              {brief.sourceFileUrl && (
                <div className="flex items-center gap-3">
                  <span className="text-sp-admin-muted">Archivo:</span>
                  <a href={brief.sourceFileUrl} target="_blank" rel="noreferrer"
                    className="text-sp-admin-accent hover:underline font-medium truncate max-w-[320px]">
                    {brief.sourceFileName ?? 'Ver archivo'}
                  </a>
                  <span className="text-sp-admin-muted/50 text-[10px]">{brief.sourceFileMime}</span>
                </div>
              )}

              {/* Revisión */}
              {brief.status === 'approved' && brief.reviewedAt && (
                <p className="text-emerald-700">
                  ✓ Aprobado el {new Date(brief.reviewedAt).toLocaleDateString('es-ES')}
                  {brief.reviewedByName ? ` por ${brief.reviewedByName}` : ''}
                </p>
              )}

              {/* Notas */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-sp-admin-muted">Notas internas</span>
                  {!editNotes && (
                    <button type="button" onClick={() => setEditNotes(true)}
                      className="text-[10px] text-sp-admin-accent hover:underline">Editar</button>
                  )}
                </div>
                {editNotes ? (
                  <div className="flex gap-2">
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      rows={3}
                      className={`${INPUT} flex-1 text-[12px]`}
                    />
                    <div className="flex flex-col gap-1 shrink-0">
                      <button type="button" onClick={saveNotes} disabled={isPending}
                        className="px-3 py-1 rounded text-[11px] font-semibold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 disabled:opacity-50">
                        Guardar
                      </button>
                      <button type="button" onClick={() => { setEditNotes(false); setNotesDraft(brief.notes ?? ''); }}
                        className="px-3 py-1 rounded text-[11px] font-semibold text-sp-admin-muted hover:bg-sp-admin-hover border border-sp-admin-border">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={brief.notes ? 'text-sp-admin-text leading-relaxed' : 'text-sp-admin-muted/50 italic'}>
                    {brief.notes || 'Sin notas. Haz clic en Editar para añadir.'}
                  </p>
                )}
              </div>

              {/* Campos estructurados — vacíos en Fase 1, preparados para Fase 2 */}
              <div className="rounded-lg border border-dashed border-sp-admin-border px-4 py-3 text-sp-admin-muted/60 text-[11px]">
                Extracción automática de datos (IA) — disponible en Fase 2
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Tab principal ─────────────────────────────────────────────────────

export function BrandBriefsTab({ brandId, briefs, isAdmin }: Props): React.ReactElement {
  const [showUpload, setShowUpload] = useState(false);
  const [filterStatus, setStatus] = useState('');

  const filtered = filterStatus ? briefs.filter((b) => b.status === filterStatus) : briefs;

  const counts = {
    pending:  briefs.filter((b) => b.status === 'pending_review').length,
    approved: briefs.filter((b) => b.status === 'approved').length,
    archived: briefs.filter((b) => b.status === 'archived').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {[
              { label: 'Todos', value: '' },
              { label: `Revisión (${counts.pending})`, value: 'pending_review' },
              { label: `Aprobados (${counts.approved})`, value: 'approved' },
              { label: `Archivados (${counts.archived})`, value: 'archived' },
            ].map((f) => (
              <button key={f.value} type="button" onClick={() => setStatus(f.value)}
                className={`h-7 px-3 rounded-lg text-[11px] font-semibold transition-colors ${
                  filterStatus === f.value
                    ? 'bg-sp-admin-accent text-white'
                    : 'border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setShowUpload(true)}
          className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 transition-colors">
          + Subir brief
        </button>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-12 text-center">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm font-semibold text-sp-admin-text">
            {briefs.length === 0 ? 'Sin briefs todavía' : 'Sin briefs con este filtro'}
          </p>
          <p className="text-[11px] text-sp-admin-muted mt-1">
            {briefs.length === 0 ? 'Sube el primer brief de esta marca.' : 'Prueba con otro filtro.'}
          </p>
          {briefs.length === 0 && (
            <button type="button" onClick={() => setShowUpload(true)}
              className="mt-4 text-[12px] font-semibold text-sp-admin-accent hover:underline">
              Subir primer brief →
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-hover/40">
                <th className="px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] text-left">Nombre</th>
                <th className="px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] text-left">Versión</th>
                <th className="px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] text-left">GEO</th>
                <th className="px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] text-left">Estado</th>
                <th className="px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] text-left">Fecha</th>
                <th className="px-3 py-2.5 text-[9px] font-bold text-sp-admin-muted uppercase tracking-[0.18em] w-40" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((brief) => (
                <BriefRow key={brief.id} brief={brief} brandId={brandId} isAdmin={isAdmin} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && <UploadModal brandId={brandId} onClose={() => setShowUpload(false)} />}
    </div>
  );
}
