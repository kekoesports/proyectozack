'use client';

import { useActionState, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  uploadBriefAction,
  approveBriefAction,
  archiveBriefAction,
  deleteBriefAction,
  updateBriefContentAction,
  createEmptyBriefAction,
} from '@/app/admin/(dashboard)/brands/brief-actions';
import type { BrandBriefWithUser } from '@/types';
import type { BriefContent } from '@/db/schema/brandBriefs';

type Props = {
  readonly brandId: number;
  readonly briefs:  readonly BrandBriefWithUser[];
  readonly isAdmin: boolean;
};

// ── Config visual ─────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending_review: { label: 'Pendiente revisión', cls: 'bg-amber-50 text-amber-700 border-amber-200'     },
  approved:       { label: 'Aprobado',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  archived:       { label: 'Archivado',          cls: 'bg-zinc-100 text-zinc-500 border-zinc-200'       },
};

function fileIcon(mime: string | null): string {
  if (!mime) return '📄';
  if (mime === 'application/pdf') return '📕';
  if (mime.includes('word')) return '📝';
  if (mime.startsWith('image/')) return '🖼️';
  return '📄';
}

const I    = 'w-full rounded-lg border border-sp-admin-border bg-white px-3 py-2 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const TA   = `${I} resize-none`;
const LB   = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';
const SEC  = 'text-[9px] font-black uppercase tracking-[0.2em] text-sp-admin-muted/70 mb-3 pb-1.5 border-b border-sp-admin-border/60 flex items-center gap-2';

// ── Secciones del brief ───────────────────────────────────────────────

type SectionKey = 'info' | 'mensaje' | 'guidelines' | 'restricciones';

const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: 'info',          label: 'Información general', icon: '📋' },
  { key: 'mensaje',       label: 'Mensaje y conversión', icon: '🎯' },
  { key: 'guidelines',    label: 'Guidelines',          icon: '✍️' },
  { key: 'restricciones', label: 'Restricciones',       icon: '🚫' },
];

// ── Campo de texto con label ──────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, rows = 3, disabled = false, hint,
}: {
  readonly label:       string;
  readonly value:       string;
  readonly onChange:    (v: string) => void;
  readonly placeholder?: string;
  readonly rows?:       number;
  readonly disabled?:   boolean;
  readonly hint?:       string;
}): React.ReactElement {
  return (
    <div>
      <label className={LB}>{label}</label>
      {rows === 1 ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={I}
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={TA}
        />
      )}
      {hint && <p className="text-[9px] text-sp-admin-muted/60 mt-1">{hint}</p>}
    </div>
  );
}

// ── Vista de solo lectura de un campo ─────────────────────────────────

function ReadField({ label, value }: { readonly label: string; readonly value?: string | null | undefined }): React.ReactElement | null {
  if (!value) return null;
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-0.5">{label}</p>
      <p className="text-[12px] text-sp-admin-text whitespace-pre-line leading-relaxed">{value}</p>
    </div>
  );
}

// ── Formulario de edición de contenido ───────────────────────────────

function BriefContentForm({
  brief, brandId, onClose,
}: {
  readonly brief:   BrandBriefWithUser;
  readonly brandId: number;
  readonly onClose: () => void;
}): React.ReactElement {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [activeSection, setActiveSection] = useState<SectionKey>('info');

  const init = (brief.briefContent ?? {}) as BriefContent;
  const [name,                 setName]                = useState(brief.name);
  const [version,              setVersion]             = useState(brief.version ?? 'v1');
  const [geo,                  setGeo]                 = useState(brief.geo ?? '');
  const [description,          setDescription]         = useState(init.description ?? '');
  const [productType,          setProductType]         = useState(init.productType ?? '');
  const [targetAudience,       setTargetAudience]      = useState(init.targetAudience ?? '');
  const [mainMessage,          setMainMessage]         = useState(init.mainMessage ?? '');
  const [callToAction,         setCallToAction]        = useState(init.callToAction ?? '');
  const [mainLink,             setMainLink]            = useState(init.mainLink ?? '');
  const [affiliateCode,        setAffiliateCode]       = useState(init.affiliateCode ?? '');
  const [influencerGuidelines, setInfluencerGuidelines] = useState(init.influencerGuidelines ?? '');
  const [restrictions,         setRestrictions]        = useState(init.restrictions ?? '');
  const [legalNotes,           setLegalNotes]          = useState(init.legalNotes ?? '');
  const [contentNotes,         setContentNotes]        = useState(init.contentNotes ?? '');

  function handleSave(): void {
    setSaving(true);
    setError('');
    startTransition(async () => {
      const content: BriefContent = {
        description:          description           || null,
        productType:          productType           || null,
        targetAudience:       targetAudience        || null,
        mainMessage:          mainMessage           || null,
        callToAction:         callToAction          || null,
        mainLink:             mainLink              || null,
        affiliateCode:        affiliateCode         || null,
        influencerGuidelines: influencerGuidelines  || null,
        restrictions:         restrictions          || null,
        legalNotes:           legalNotes            || null,
        contentNotes:         contentNotes          || null,
      };
      const result = await updateBriefContentAction(brief.id, brandId, content, { name, version, geo });
      if (result.success) {
        router.refresh();
        onClose();
      } else {
        setError(result.error ?? 'Error al guardar');
        setSaving(false);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Meta del brief */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className={LB}>Nombre del brief *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={I} />
        </div>
        <div>
          <label className={LB}>Versión</label>
          <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1" className={I} />
        </div>
        <div>
          <label className={LB}>GEO</label>
          <input value={geo} onChange={(e) => setGeo(e.target.value)} placeholder="Global, LATAM, España…" className={I} />
        </div>
      </div>

      {/* Tabs de sección */}
      <div className="flex gap-0 border-b border-sp-admin-border -mb-px">
        {SECTIONS.map((s) => (
          <button key={s.key} type="button" onClick={() => setActiveSection(s.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold transition-colors border-b-2 -mb-px ${
              activeSection === s.key
                ? 'border-sp-admin-accent text-sp-admin-accent'
                : 'border-transparent text-sp-admin-muted hover:text-sp-admin-text'
            }`}>
            <span aria-hidden>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      {/* Contenido de cada sección */}
      <div className="space-y-4">
        {activeSection === 'info' && (
          <>
            <Field label="Descripción del producto / marca" value={description} onChange={setDescription}
              placeholder="Describe brevemente qué es la marca y qué ofrece…" rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo de producto / servicio" value={productType} onChange={setProductType}
                placeholder="Casino online, Software SaaS, E-commerce…" rows={1} />
              <Field label="GEO objetivo de campaña" value={geo} onChange={setGeo}
                placeholder="España, LATAM, Global…" rows={1} />
            </div>
            <Field label="Audiencia objetivo" value={targetAudience} onChange={setTargetAudience}
              placeholder="Hombres 18-35 años, interesados en gaming y apuestas…" rows={2} />
          </>
        )}

        {activeSection === 'mensaje' && (
          <>
            <Field label="Mensaje principal" value={mainMessage} onChange={setMainMessage}
              placeholder="¿Qué mensaje queremos transmitir? ¿Qué queremos que la audiencia sienta/piense?" rows={3} />
            <Field label="Call to Action (CTA)" value={callToAction} onChange={setCallToAction}
              placeholder="Regístrate, obtén tu bono, descarga la app…" rows={1} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Link principal" value={mainLink} onChange={setMainLink}
                placeholder="https://…" rows={1} />
              <Field label="Código de afiliado" value={affiliateCode} onChange={setAffiliateCode}
                placeholder="SOCIALPRO20, REF-ZACK…" rows={1}
                hint="Si aplica — código para tracking" />
            </div>
          </>
        )}

        {activeSection === 'guidelines' && (
          <>
            <Field label="Guidelines para el influencer" value={influencerGuidelines} onChange={setInfluencerGuidelines}
              placeholder="• Qué decir exactamente&#10;• Cómo presentar el producto&#10;• Tono de comunicación&#10;• Ejemplos de frases aprobadas…" rows={6} />
            <Field label="Notas adicionales de contenido" value={contentNotes} onChange={setContentNotes}
              placeholder="Observaciones sobre formato, duración, estilo visual…" rows={3} />
          </>
        )}

        {activeSection === 'restricciones' && (
          <>
            <Field label="Restricciones de contenido" value={restrictions} onChange={setRestrictions}
              placeholder="• Qué NO se puede mencionar&#10;• Palabras o frases prohibidas&#10;• Temas a evitar&#10;• Comparaciones con competidores no permitidas…" rows={6} />
            <Field label="Notas legales / disclaimers" value={legalNotes} onChange={setLegalNotes}
              placeholder="Texto legal obligatorio, advertencias de juego responsable, términos y condiciones…" rows={4}
              hint="Texto que debe incluirse en la descripción o como fijado" />
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-700">{error}</div>
      )}

      {/* Botones */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-sp-admin-border/60">
        <button type="button" onClick={onClose}
          className="h-8 px-4 rounded-lg border border-sp-admin-border text-[12px] text-sp-admin-muted hover:bg-sp-admin-hover transition-colors">
          Cancelar
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="h-8 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors">
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// ── Vista de solo lectura del brief ───────────────────────────────────

function BriefReadView({ brief, brandId, isAdmin, onEdit }: {
  readonly brief:   BrandBriefWithUser;
  readonly brandId: number;
  readonly isAdmin: boolean;
  readonly onEdit:  () => void;
}): React.ReactElement {
  const [, startTransition] = useTransition();
  const router = useRouter();
  const c = (brief.briefContent ?? {}) as BriefContent;
  const status = STATUS_CFG[brief.status] ?? { label: brief.status, cls: 'bg-slate-100 text-slate-500 border-slate-200' };

  const isEmpty = !c.description && !c.mainMessage && !c.callToAction && !c.influencerGuidelines && !c.restrictions;

  function handleApprove(): void {
    startTransition(async () => {
      await approveBriefAction(brief.id, brandId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Header del brief */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-[15px] font-bold text-sp-admin-text">{brief.name}</h3>
            <span className="text-[10px] font-bold text-sp-admin-muted bg-sp-admin-hover border border-sp-admin-border rounded-full px-2 py-0.5">
              {brief.version ?? 'v1'}
            </span>
            {brief.geo && (
              <span className="text-[10px] font-semibold text-sp-admin-muted">🌍 {brief.geo}</span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${status.cls}`}>
              {status.label}
            </span>
          </div>
          {brief.createdByName && (
            <p className="text-[10px] text-sp-admin-muted mt-0.5">
              Creado por {brief.createdByName} · {new Date(brief.createdAt).toLocaleDateString('es-ES')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && brief.status === 'pending_review' && (
            <button type="button" onClick={handleApprove}
              className="h-7 px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors">
              ✓ Aprobar
            </button>
          )}
          {isAdmin && (
            <button type="button" onClick={onEdit}
              className="h-7 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
              Editar brief
            </button>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card/50 p-6 text-center">
          <p className="text-[13px] text-sp-admin-muted">Brief vacío.</p>
          {isAdmin && (
            <button type="button" onClick={onEdit}
              className="mt-2 text-[11px] font-semibold text-sp-admin-accent hover:underline">
              Añadir contenido →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sección 1 — Info general */}
          {(c.description || c.productType || c.targetAudience) && (
            <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card px-5 py-4 space-y-3">
              <p className={SEC}><span aria-hidden>📋</span> Información general</p>
              <ReadField label="Descripción" value={c.description} />
              <ReadField label="Tipo de producto" value={c.productType} />
              <ReadField label="Audiencia objetivo" value={c.targetAudience} />
            </div>
          )}

          {/* Sección 2 — Mensaje y conversión */}
          {(c.mainMessage || c.callToAction || c.mainLink || c.affiliateCode) && (
            <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card px-5 py-4 space-y-3">
              <p className={SEC}><span aria-hidden>🎯</span> Mensaje y conversión</p>
              <ReadField label="Mensaje principal" value={c.mainMessage} />
              <div className="grid grid-cols-2 gap-3">
                <ReadField label="CTA" value={c.callToAction} />
                <ReadField label="Código afiliado" value={c.affiliateCode} />
              </div>
              {c.mainLink && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-0.5">Link principal</p>
                  <a href={c.mainLink} target="_blank" rel="noopener noreferrer"
                    className="text-[12px] text-sp-admin-accent hover:underline break-all">
                    {c.mainLink}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Sección 3 — Guidelines */}
          {(c.influencerGuidelines || c.contentNotes) && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 px-5 py-4 space-y-3">
              <p className={`${SEC} text-emerald-700/70 border-emerald-200/60`}><span aria-hidden>✍️</span> Guidelines para el influencer</p>
              <ReadField label="Qué decir / cómo comunicar" value={c.influencerGuidelines} />
              <ReadField label="Notas de contenido" value={c.contentNotes} />
            </div>
          )}

          {/* Sección 4 — Restricciones */}
          {(c.restrictions || c.legalNotes) && (
            <div className="rounded-xl border border-red-200 bg-red-50/30 px-5 py-4 space-y-3">
              <p className={`${SEC} text-red-700/70 border-red-200/60`}><span aria-hidden>🚫</span> Restricciones</p>
              <ReadField label="Qué evitar / prohibido" value={c.restrictions} />
              <ReadField label="Notas legales / disclaimers" value={c.legalNotes} />
            </div>
          )}
        </div>
      )}

      {/* Archivo adjunto */}
      {brief.sourceFileUrl && (
        <div className="flex items-center gap-3 rounded-xl border border-sp-admin-border bg-sp-admin-hover/20 px-4 py-3">
          <span className="text-xl" aria-hidden>{fileIcon(brief.sourceFileMime ?? null)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-sp-admin-text truncate">{brief.sourceFileName ?? 'Archivo adjunto'}</p>
            <p className="text-[10px] text-sp-admin-muted">{brief.sourceFileMime ?? ''}</p>
          </div>
          <a href={brief.sourceFileUrl} target="_blank" rel="noopener noreferrer"
            className="text-[11px] font-bold text-sp-admin-accent hover:underline shrink-0">
            Abrir →
          </a>
        </div>
      )}

      {brief.notes && (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-sp-admin-muted mb-1">Notas internas</p>
          <p className="text-[12px] text-sp-admin-muted leading-relaxed whitespace-pre-line">{brief.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Upload modal (reutiliza el existente) ─────────────────────────────

function UploadModal({ brandId, onClose }: { readonly brandId: number; readonly onClose: () => void }): React.ReactElement {
  const [state, formAction, isPending] = useActionState(uploadBriefAction, {});
  if (state.success && !isPending) setTimeout(onClose, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-sp-admin-card rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-admin-border">
          <h2 className="text-base font-bold text-sp-admin-text">Subir archivo</h2>
          <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-xl leading-none">×</button>
        </div>
        <form action={formAction} className="p-6 space-y-4">
          <input type="hidden" name="brandId" value={brandId} />
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={LB}>Nombre del brief *</label>
              <input name="name" required placeholder="Brief Q2 2026 — Casino LATAM" className={I} />
            </div>
            <div>
              <label className={LB}>Versión</label>
              <input name="version" defaultValue="v1" className={I} />
            </div>
            <div>
              <label className={LB}>GEO</label>
              <input name="geo" placeholder="LATAM, España…" className={I} />
            </div>
          </div>
          <div>
            <label className={LB}>Archivo (PDF, DOC, imagen — máx 20 MB)</label>
            <input name="file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt"
              className={`${I} file:mr-3 file:rounded-full file:border-0 file:bg-sp-admin-hover file:px-3 file:py-1 file:text-xs file:font-semibold file:text-sp-admin-text`} />
          </div>
          <div>
            <label className={LB}>Notas</label>
            <textarea name="notes" rows={2} placeholder="Observaciones…" className={TA} />
          </div>
          {state.error && <p className="text-[12px] text-red-500">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-8 px-4 rounded-lg border border-sp-admin-border text-[12px] text-sp-admin-muted hover:bg-sp-admin-hover transition-colors">Cancelar</button>
            <button type="submit" disabled={isPending} className="h-8 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors">
              {isPending ? 'Subiendo…' : 'Subir archivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────

export function BrandBriefsTab({ brandId, briefs, isAdmin }: Props): React.ReactElement {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showUpload,   setShowUpload]   = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [editingId,    setEditingId]    = useState<number | null>(null);
  const [newName,      setNewName]      = useState('');
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState('');

  const activeBrief = useMemo(
    () => briefs.find((b) => b.status === 'approved') ?? briefs[0] ?? null,
    [briefs],
  );

  const editingBrief = editingId ? briefs.find((b) => b.id === editingId) ?? null : null;

  function handleCreateNew(): void {
    if (!newName.trim()) { setCreateError('El nombre es obligatorio'); return; }
    setCreating(true);
    setCreateError('');
    startTransition(async () => {
      const res = await createEmptyBriefAction(brandId, newName.trim());
      if (res.success) {
        setEditingId(res.id ?? null);
        setShowNew(false);
        setNewName('');
        router.refresh();
      } else {
        setCreateError(res.error ?? 'Error al crear');
      }
      setCreating(false);
    });
  }

  function handleDelete(brief: typeof briefs[number]): void {
    if (!confirm(`¿Eliminar el brief "${brief.name}"?`)) return;
    startTransition(async () => {
      await deleteBriefAction(brief.id, brandId);
      router.refresh();
    });
  }

  // ── Vista de edición ──

  if (editingBrief) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEditingId(null)}
            className="text-[11px] text-sp-admin-muted hover:text-sp-admin-accent transition-colors">
            ← Volver al brief
          </button>
        </div>
        <BriefContentForm brief={editingBrief} brandId={brandId} onClose={() => setEditingId(null)} />
      </div>
    );
  }

  // ── Vista principal ──

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[13px] font-bold text-sp-admin-text">Brief / Dossier de marca</h3>
          <p className="text-[10px] text-sp-admin-muted mt-0.5">
            {briefs.length === 0 ? 'Sin briefs todavía' : `${briefs.length} ${briefs.length === 1 ? 'brief' : 'briefs'}`}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowUpload(true)}
              className="h-7 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:bg-sp-admin-hover transition-colors">
              📎 Subir archivo
            </button>
            <button type="button" onClick={() => setShowNew(true)}
              className="h-7 px-3 rounded-lg bg-sp-admin-accent text-white text-[11px] font-bold hover:bg-sp-admin-accent/90 transition-colors">
              + Nuevo brief
            </button>
          </div>
        )}
      </div>

      {/* Formulario nuevo brief */}
      {showNew && (
        <div className="rounded-xl border border-sp-admin-accent/30 bg-sp-admin-card/60 px-4 py-4 space-y-3">
          <p className="text-[11px] font-bold text-sp-admin-text">Nombre del nuevo brief</p>
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Brief Q3 2026 — Marca…"
              className={`${I} flex-1`}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
            />
            <button type="button" onClick={handleCreateNew} disabled={creating}
              className="h-9 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-bold disabled:opacity-50 transition-colors">
              Crear
            </button>
            <button type="button" onClick={() => { setShowNew(false); setNewName(''); setCreateError(''); }}
              className="h-9 px-3 rounded-lg border border-sp-admin-border text-[12px] text-sp-admin-muted hover:bg-sp-admin-hover transition-colors">
              Cancelar
            </button>
          </div>
          {createError && <p className="text-[11px] text-red-500">{createError}</p>}
        </div>
      )}

      {/* Lista/Vista de briefs */}
      {briefs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-8 text-center">
          <p className="text-[14px] font-semibold text-sp-admin-text mb-1">Sin briefs de marca</p>
          <p className="text-[12px] text-sp-admin-muted mb-4">
            Crea un brief para centralizar información, guidelines y restricciones de esta marca.
          </p>
          {isAdmin && (
            <button type="button" onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors">
              + Crear primer brief
            </button>
          )}
        </div>
      ) : briefs.length === 1 ? (
        // Vista detalle si solo hay uno
        <BriefReadView
          brief={briefs[0]!}
          brandId={brandId}
          isAdmin={isAdmin}
          onEdit={() => setEditingId(briefs[0]!.id)}
        />
      ) : (
        // Lista cuando hay varios
        <div className="space-y-3">
          {briefs.map((brief) => {
            const status = STATUS_CFG[brief.status] ?? { label: brief.status, cls: 'bg-slate-100 text-slate-500 border-slate-200' };
            const c      = (brief.briefContent ?? {}) as BriefContent;
            return (
              <div key={brief.id} className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
                <div className="flex items-start justify-between gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-bold text-sp-admin-text">{brief.name}</p>
                      <span className="text-[9px] font-bold rounded-full bg-sp-admin-hover border border-sp-admin-border px-2 py-0.5 text-sp-admin-muted">
                        {brief.version}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    {c.callToAction && (
                      <p className="text-[11px] text-sp-admin-muted mt-0.5">CTA: {c.callToAction}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isAdmin && (
                      <>
                        <button type="button" onClick={() => setEditingId(brief.id)}
                          className="h-7 px-2.5 rounded-lg border border-sp-admin-border text-[11px] text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
                          Editar
                        </button>
                        <button type="button" onClick={() => handleDelete(brief)}
                          className="h-7 px-2 rounded-lg text-[11px] text-red-400 hover:bg-red-50 transition-colors">
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      {showUpload && <UploadModal brandId={brandId} onClose={() => setShowUpload(false)} />}
    </div>
  );
}
