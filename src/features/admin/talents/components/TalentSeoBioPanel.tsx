'use client';

import { useState, useTransition } from 'react';
import { generateSeoBioAction, saveSeoBioManualAction, approveSeoBioAction } from '@/app/admin/(dashboard)/talents/[id]/seo-actions';

// ── Types ─────────────────────────────────────────────────────────────────────

type SeoBioStatus = 'empty' | 'generated' | 'edited' | 'approved';

type Props = {
  readonly talentId: number;
  readonly talentName: string;
  readonly seoBioStatus: SeoBioStatus;
  readonly seoBioGenerated: string | null;
  readonly seoBioManual: string | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly seoKeywords: string[] | null;
};

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<SeoBioStatus, { label: string; cls: string; publicNote: string }> = {
  empty:     {
    label: 'Sin bio SEO',
    cls: 'bg-sp-admin-hover text-sp-admin-muted',
    publicNote: 'La página pública usa el bio corto del perfil.',
  },
  generated: {
    label: '⚠ Borrador IA — pendiente de aprobación',
    cls: 'bg-amber-50 text-amber-700 border border-amber-200',
    publicNote: 'No visible en la web pública hasta que apruebes o añadas una bio manual.',
  },
  edited: {
    label: '✏ Editado manualmente — publicado',
    cls: 'bg-blue-50 text-blue-700 border border-blue-200',
    publicNote: 'La bio manual está visible en la página pública. Aprueba para activar también el SEO title y description.',
  },
  approved: {
    label: '✓ Aprobado — publicado',
    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    publicNote: 'Toda la información SEO (bio, title, description) está activa en la página pública.',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Panel de gestión del SEO bio de un talento en el CRM.
 * Permite generar con IA, editar manualmente y aprobar.
 *
 * @kind client
 * @feature admin/talents
 */
export function TalentSeoBioPanel({
  talentId,
  talentName,
  seoBioStatus: initialStatus,
  seoBioGenerated: initialGenerated,
  seoBioManual: initialManual,
  seoTitle: initialTitle,
  seoDescription: initialDesc,
  seoKeywords: initialKeywords,
}: Props): React.ReactElement {
  const [status,     setStatus]     = useState<SeoBioStatus>(initialStatus);
  const [generated,  setGenerated]  = useState(initialGenerated ?? '');
  const [manual,     setManual]     = useState(initialManual ?? '');
  const [title,      setTitle]      = useState(initialTitle ?? '');
  const [desc,       setDesc]       = useState(initialDesc ?? '');
  const [keywords,   setKeywords]   = useState(initialKeywords?.join(', ') ?? '');
  const [warnings,   setWarnings]   = useState<string[]>([]);
  const [error,      setError]      = useState('');
  const [saveOk,     setSaveOk]     = useState(false);
  const [isPending,  startTransition] = useTransition();

  const statusStyle = STATUS_STYLES[status];
  const hasManual   = manual.trim().length > 0;
  const hasGenerated = generated.trim().length > 0;

  // ── Generate ─────────────────────────────────────────────────────────────

  function handleGenerate(): void {
    if (hasManual && !confirm(
      `Ya existe una bio editada manualmente.\n¿Quieres generar una nueva versión IA como borrador?\nNo se perderá tu texto manual.`
    )) return;

    setError('');
    setSaveOk(false);
    setWarnings([]);

    startTransition(async () => {
      const result = await generateSeoBioAction(talentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGenerated(result.bio);
      if (!hasManual) {
        setTitle(result.seoTitle);
        setDesc(result.seoDescription);
        setKeywords(result.seoKeywords.join(', '));
      }
      setStatus('generated');
      if (result.warnings.length > 0) setWarnings(result.warnings);
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave(): void {
    setError('');
    setSaveOk(false);

    startTransition(async () => {
      const result = await saveSeoBioManualAction(talentId, {
        seoBioManual:   manual.trim() || undefined,
        seoTitle:       title.trim() || undefined,
        seoDescription: desc.trim() || undefined,
        seoKeywords:    keywords.split(',').map((k) => k.trim()).filter(Boolean),
      });
      if (!result.ok) { setError(result.error); return; }
      setSaveOk(true);
      if (manual.trim()) setStatus('edited');
    });
  }

  // ── Approve ───────────────────────────────────────────────────────────────

  function handleApprove(): void {
    setError('');
    setSaveOk(false);

    startTransition(async () => {
      const result = await approveSeoBioAction(talentId);
      if (!result.ok) { setError(result.error); return; }
      setStatus('approved');
      setSaveOk(true);
    });
  }

  // ── Copy generated to manual ──────────────────────────────────────────────

  function copyGeneratedToManual(): void {
    setManual(generated);
    setSaveOk(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const CLS_LABEL = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';
  const CLS_INPUT = 'w-full rounded-md border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50';
  const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">

      {/* Status + acciones principales */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusStyle.cls}`}>
            {statusStyle.label}
          </span>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="h-8 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? 'Generando…' : hasGenerated ? '↺ Regenerar con IA' : '✨ Generar con IA'}
        </button>
          {(hasGenerated || hasManual) && status !== 'approved' && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isPending}
              className="h-8 px-4 rounded-lg border border-emerald-300 text-emerald-700 text-[12px] font-semibold hover:bg-emerald-50 disabled:opacity-50 transition-colors"
            >
              ✓ Aprobar
            </button>
          )}
        </div>
        <p className="text-[11px] text-sp-admin-muted">{statusStyle.publicNote}</p>
      </div>

      {/* Warnings de IA */}
      {warnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-[12px] text-amber-700">{w}</p>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-[12px] text-red-600 font-medium">{error}</p>
      )}

      {/* Bio generada por IA — solo lectura, para inspección */}
      {hasGenerated && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={CLS_LABEL}>Bio generada por IA (borrador)</label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-sp-admin-muted">{wordCount(generated)} palabras</span>
              <button
                type="button"
                onClick={copyGeneratedToManual}
                className="text-[11px] text-sp-admin-accent hover:underline"
              >
                Copiar al editor →
              </button>
            </div>
          </div>
          <div className="rounded-md border border-sp-admin-border bg-sp-admin-hover/30 px-3 py-3">
            {generated.split('\n\n').map((p, i) => (
              <p key={i} className="text-[13px] text-sp-admin-muted leading-relaxed mb-2 last:mb-0">{p}</p>
            ))}
          </div>
        </div>
      )}

      {/* Bio manual (campo editable) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="seo-bio-manual" className={CLS_LABEL}>
            Bio manual (tiene prioridad sobre la generada)
          </label>
          <span className="text-[10px] text-sp-admin-muted">{wordCount(manual)} palabras</span>
        </div>
        <textarea
          id="seo-bio-manual"
          rows={8}
          value={manual}
          onChange={(e) => { setManual(e.target.value); setSaveOk(false); }}
          placeholder={`Describe a ${talentName} en 200-300 palabras: plataforma, juego, audiencia, tipo de contenido y representación por SocialPro...`}
          className={`${CLS_INPUT} resize-y`}
        />
        {manual.trim() && wordCount(manual) < 100 && (
          <p className="text-[11px] text-amber-600">Mínimo recomendado: 180 palabras ({wordCount(manual)} actuales).</p>
        )}
        {manual.trim() && wordCount(manual) > 350 && (
          <p className="text-[11px] text-amber-600">Máximo recomendado: 320 palabras ({wordCount(manual)} actuales).</p>
        )}
      </div>

      {/* SEO Title */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="seo-title" className={CLS_LABEL}>SEO Title</label>
          <span className={`text-[10px] font-bold ${title.length > 65 ? 'text-amber-600' : 'text-sp-admin-muted'}`}>
            {title.length}/65
          </span>
        </div>
        <input
          id="seo-title"
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setSaveOk(false); }}
          placeholder={`${talentName} — Streamer de... | SocialPro`}
          className={CLS_INPUT}
          maxLength={200}
        />
        {title.length > 65 && (
          <p className="text-[11px] text-amber-600">Google trunca títulos mayores de 65 caracteres.</p>
        )}
      </div>

      {/* SEO Description */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="seo-description" className={CLS_LABEL}>Meta Description</label>
          <span className={`text-[10px] font-bold ${desc.length > 155 ? 'text-amber-600' : 'text-sp-admin-muted'}`}>
            {desc.length}/155
          </span>
        </div>
        <textarea
          id="seo-description"
          rows={2}
          value={desc}
          onChange={(e) => { setDesc(e.target.value); setSaveOk(false); }}
          placeholder={`Conoce a ${talentName}, creador gestionado por SocialPro...`}
          className={`${CLS_INPUT} resize-none`}
          maxLength={300}
        />
        {desc.length > 155 && (
          <p className="text-[11px] text-amber-600">Google trunca meta descriptions mayores de 155 caracteres.</p>
        )}
      </div>

      {/* Keywords internas */}
      <div className="space-y-1.5">
        <label htmlFor="seo-keywords" className={CLS_LABEL}>
          Keywords (uso interno CRM — separadas por comas)
        </label>
        <input
          id="seo-keywords"
          type="text"
          value={keywords}
          onChange={(e) => { setKeywords(e.target.value); setSaveOk(false); }}
          placeholder="todocs2, streamer cs2, twitch españa, cs2 highlights..."
          className={CLS_INPUT}
        />
        <p className="text-[10px] text-sp-admin-muted">
          No se emiten como meta tag público. Solo para filtrado y agrupación en CRM.
        </p>
      </div>

      {/* Guardar */}
      <div className="flex items-center gap-3 pt-2 border-t border-sp-admin-border">
        {saveOk && <span className="text-[12px] text-emerald-600 font-semibold">✓ Guardado y revalidado</span>}
        {error && <span className="text-[12px] text-red-600">{error}</span>}
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="h-9 px-6 rounded-lg bg-sp-admin-accent text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

    </div>
  );
}
