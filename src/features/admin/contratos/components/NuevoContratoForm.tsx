'use client';

import { useActionState, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  detectPlaceholders,
  fillTemplate,
  VARIABLE_LABEL,
  buildAgencyVars,
} from '@/lib/contractVariables';
import { saveGeneratedContractAction } from '@/app/admin/(dashboard)/contratos/actions';
import type { ContractTemplate } from '@/lib/queries/contractTemplates';

// ── Estilos ────────────────────────────────────────────────────────────

const I  = 'w-full rounded-lg border border-sp-admin-border bg-white px-3 py-2 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const LB = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';
const BP = 'h-9 px-5 rounded-lg bg-sp-admin-accent text-white text-[12px] font-bold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors';
const BG = 'h-9 px-4 rounded-lg border border-sp-admin-border text-[12px] text-sp-admin-muted hover:bg-sp-admin-hover hover:text-sp-admin-text transition-colors';

const AGENCY_KEYS = new Set(['agency_name', 'agency_entity', 'agency_taxid', 'today', 'currency']);

// ── Types ──────────────────────────────────────────────────────────────

type TalentOption = { readonly id: number; readonly name: string };
type BrandOption  = { readonly id: number; readonly name: string };

type Props = {
  readonly templates: readonly ContractTemplate[];
  readonly talents:   readonly TalentOption[];
  readonly brands:    readonly BrandOption[];
};

// ── Componente ─────────────────────────────────────────────────────────

export function NuevoContratoForm({ templates, talents, brands }: Props): React.ReactElement {
  const router = useRouter();
  const [state, formAction] = useActionState(saveGeneratedContractAction, {});

  // Metadatos
  const [title,      setTitle]    = useState('');
  const [talentId,   setTalent]   = useState('');
  const [brandId,    setBrand]    = useState('');
  const [templateId, setTemplate] = useState<string>(String(templates[0]?.id ?? ''));

  // Contenido
  const [editedContent, setContent] = useState<string | null>(null);

  // Variables
  const [varValues, setVarValues] = useState<Record<string, string>>({});

  // Estado de generación
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === Number(templateId)) ?? null,
    [templates, templateId],
  );

  const baseContent = editedContent ?? (selectedTemplate?.content ?? '');

  const placeholders = useMemo(() => detectPlaceholders(baseContent), [baseContent]);

  const agencyVars = useMemo(() => buildAgencyVars(), []);

  const mergedVars = useMemo(
    () => ({ ...agencyVars, ...varValues }),
    [agencyVars, varValues],
  );

  const previewContent = useMemo(
    () => fillTemplate(baseContent, mergedVars),
    [baseContent, mergedVars],
  );

  function onTemplateChange(val: string): void {
    setTemplate(val);
    setContent(null);
    setVarValues({});
  }

  function onTalentChange(val: string): void {
    setTalent(val);
    const name = talents.find((t) => t.id === Number(val))?.name ?? '';
    setVarValues((prev) => ({ ...prev, influencer_name: name, influencer_alias: name }));
  }

  function onBrandChange(val: string): void {
    setBrand(val);
    const name = brands.find((b) => b.id === Number(val))?.name ?? '';
    setVarValues((prev) => ({ ...prev, brand_name: name }));
  }

  function setVar(key: string, value: string): void {
    setVarValues((prev) => ({ ...prev, [key]: value }));
  }

  // ── PDF generation + submit ───────────────────────────────────────────

  async function handleGenerate(): Promise<void> {
    if (!title.trim())     { setGenError('El título es obligatorio'); return; }
    if (!baseContent.trim()) { setGenError('El contenido no puede estar vacío'); return; }

    setGenerating(true);
    setGenError(null);

    try {
      const { jsPDF } = await import('jspdf');

      const PAGE_W         = 210;
      const PAGE_H         = 297;
      const MARGIN         = 20;
      const COL_R          = PAGE_W - MARGIN;
      const CONTENT_BOTTOM = PAGE_H - 16;
      const ACCENT         = '#f5632a';
      const GRAY           = '#72728a';
      const BLACK          = '#16161f';
      const LIGHT          = '#f5f5fa';
      const BORDER         = '#e2e2ec';

      const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let y       = 0;
      let pageNum = 1;

      function sf(size: number, style: 'normal' | 'bold' = 'normal', color = BLACK): void {
        doc.setFontSize(size); doc.setFont('helvetica', style); doc.setTextColor(color);
      }
      function fillRect(x: number, yy: number, w: number, h: number, fill: string): void {
        doc.setFillColor(fill); doc.setDrawColor(fill); doc.rect(x, yy, w, h, 'F');
      }
      function hLine(yy: number, color = BORDER): void {
        doc.setDrawColor(color); doc.setLineWidth(0.25); doc.line(MARGIN, yy, COL_R, yy);
      }
      function addHeader(): void {
        fillRect(0, 0, PAGE_W, 2.5, ACCENT);
        sf(15, 'bold', ACCENT); doc.text('SocialPro', MARGIN, 11);
        sf(11, 'bold', BLACK);  doc.text('CONTRATO', COL_R, 9, { align: 'right' });
        sf(8,  'normal', GRAY); doc.text(selectedTemplate?.name ?? title, COL_R, 14, { align: 'right' });
        y = 20; hLine(y, BORDER); y += 6;
      }
      function addFooter(): void {
        hLine(PAGE_H - 13, BORDER);
        sf(7, 'normal', GRAY);
        doc.text('SocialPro · Contrato de servicios', MARGIN, PAGE_H - 9);
        doc.text(`Pág. ${pageNum}`, COL_R, PAGE_H - 9, { align: 'right' });
        doc.text(new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), PAGE_W / 2, PAGE_H - 9, { align: 'center' });
      }
      function checkPage(needed = 6): void {
        if (y + needed > CONTENT_BOTTOM) { addFooter(); doc.addPage(); pageNum++; addHeader(); }
      }

      addHeader();

      // Bloque resumen
      const metaRows: [string, string][] = [
        ['Título',  title],
        ['Talento', mergedVars['influencer_name'] ?? talents.find((t) => t.id === Number(talentId))?.name ?? '—'],
        ['Marca',   mergedVars['brand_name']       ?? brands.find((b)  => b.id === Number(brandId))?.name  ?? '—'],
        ['Inicio',  mergedVars['start_date']  ?? '—'],
        ['Fin',     mergedVars['end_date']    ?? '—'],
        ['Importe', mergedVars['total_amount'] ?? '—'],
      ].filter(([, v]) => v && v !== '—') as [string, string][];

      const colMid = PAGE_W / 2 + 2;
      const half   = metaRows.slice(0, Math.ceil(metaRows.length / 2));
      const second = metaRows.slice(Math.ceil(metaRows.length / 2));
      const startY = y;
      for (let i = 0; i < Math.max(half.length, second.length); i++) {
        const l = half[i]; const r = second[i];
        if (l) { sf(7, 'bold', GRAY); doc.text(l[0].toUpperCase(), MARGIN, y); sf(9, 'normal', BLACK); doc.text(l[1], MARGIN + 26, y); }
        if (r) { sf(7, 'bold', GRAY); doc.text(r[0].toUpperCase(), colMid, y);  sf(9, 'normal', BLACK); doc.text(r[1], colMid + 26, y);  }
        y += 5;
      }
      if (y > startY) { y += 3; hLine(y, '#ebebf5'); y += 7; }

      // Contenido
      for (const rawLine of previewContent.split('\n')) {
        const trimmed = rawLine.trim();
        const isSep   = /^[=\-]{3,}/.test(trimmed);
        const isTit   = /^[A-ZÁÉÍÓÚ\d\s\.]{3,}$/.test(trimmed) && trimmed.length > 2 && trimmed.length < 70;
        if (!trimmed) { y += 2.5; continue; }
        if (isSep)    { checkPage(5); hLine(y, '#d8d8e8'); y += 5; continue; }
        if (isTit)    {
          checkPage(12);
          fillRect(MARGIN, y - 3.5, COL_R - MARGIN, 7, LIGHT);
          sf(10, 'bold', ACCENT); doc.text(trimmed, MARGIN + 3, y); y += 9;
        } else {
          const wrappedRaw: unknown = doc.splitTextToSize(rawLine, COL_R - MARGIN - 2);
          const wrapped = Array.isArray(wrappedRaw) ? wrappedRaw.map(String) : [String(wrappedRaw)];
          for (const wline of wrapped) { checkPage(6); sf(9.5, 'normal', BLACK); doc.text(wline, MARGIN, y); y += 5.5; }
        }
      }
      addFooter();

      const pdfBytes = doc.output('arraybuffer');
      const pdfBlob  = new Blob([pdfBytes], { type: 'application/pdf' });
      const safeTitle = title.replace(/[^\w\s\-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
      const fileName  = `contrato-${safeTitle}-${new Date().toISOString().slice(0, 10)}.pdf`;

      const fd = new FormData();
      fd.append('pdf',        new File([pdfBlob], fileName, { type: 'application/pdf' }));
      fd.append('title',      title);
      fd.append('content',    baseContent);
      fd.append('varsJson',   JSON.stringify(mergedVars));
      fd.append('fileName',   fileName);
      if (templateId) fd.append('templateId', templateId);
      if (talentId)   fd.append('talentId',   talentId);
      if (brandId)    fd.append('brandId',    brandId);

      formAction(fd);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  }

  // ── Success ───────────────────────────────────────────────────────────

  if (state.success && state.contractId) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-8 text-center space-y-4">
        <p className="text-3xl" aria-hidden>✓</p>
        <p className="font-bold text-emerald-800 text-[15px]">Contrato generado y guardado</p>
        <p className="text-[12px] text-emerald-600">El PDF se ha subido correctamente.</p>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => router.push('/admin/contratos')} className={BG}>
            Ver todos
          </button>
          <button type="button" onClick={() => router.push(`/admin/contratos/${state.contractId}`)} className={BP}>
            Ver este contrato →
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Paso 1: Metadatos */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5 space-y-4">
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-sp-admin-muted">1 — Datos del contrato</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className={LB}>Título del contrato *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Contrato streaming — BetUS — Naow junio 2026"
              className={I}
              required
            />
          </div>
          <div>
            <label className={LB}>Plantilla</label>
            <select value={templateId} onChange={(e) => onTemplateChange(e.target.value)} className={I}>
              <option value="">— Sin plantilla —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LB}>Talento (opcional)</label>
            <select value={talentId} onChange={(e) => onTalentChange(e.target.value)} className={I}>
              <option value="">— Sin vincular —</option>
              {talents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className={LB}>Marca (opcional)</label>
            <select value={brandId} onChange={(e) => onBrandChange(e.target.value)} className={I}>
              <option value="">— Sin vincular —</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Paso 2: Variables detectadas */}
      {placeholders.length > 0 && (
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5 space-y-4">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-sp-admin-muted">
            2 — Variables ({placeholders.length} detectadas)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {placeholders.map((key) => {
              const isAuto = AGENCY_KEYS.has(key);
              return (
                <div key={key}>
                  <label className={LB}>
                    <code className="font-mono text-sp-admin-accent bg-sp-admin-accent/10 px-1 rounded text-[9px]">{`{{${key}}}`}</code>
                    <span className="ml-1 normal-case font-normal">{VARIABLE_LABEL[key] ?? key}</span>
                    {isAuto && <span className="ml-1 text-[9px] text-emerald-500 font-bold">auto</span>}
                  </label>
                  <input
                    value={isAuto ? (agencyVars[key] ?? '') : (varValues[key] ?? '')}
                    onChange={(e) => !isAuto && setVar(key, e.target.value)}
                    disabled={isAuto}
                    placeholder={isAuto ? 'Rellenado automáticamente' : `Valor para {{${key}}}`}
                    className={`${I} ${isAuto ? 'opacity-60 cursor-not-allowed bg-sp-admin-hover/50' : ''}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paso 3: Editor */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-sp-admin-muted">3 — Contenido</h2>
          {editedContent !== null && (
            <button type="button" onClick={() => setContent(null)} className={`${BG} h-7 text-[11px]`}>
              Restablecer plantilla
            </button>
          )}
        </div>
        <textarea
          value={baseContent}
          onChange={(e) => setContent(e.target.value)}
          rows={18}
          placeholder="Selecciona una plantilla o escribe el contrato aquí…"
          className={`${I} font-mono text-[11px] leading-relaxed resize-y`}
          spellCheck={false}
        />
      </div>

      {/* Preview */}
      {previewContent.trim() && (
        <details className="rounded-xl border border-sp-admin-border overflow-hidden">
          <summary className="px-4 py-2.5 text-[11px] font-semibold text-sp-admin-muted cursor-pointer hover:bg-sp-admin-hover/30 select-none bg-sp-admin-hover/20">
            Vista previa con variables reemplazadas
          </summary>
          <pre className="px-5 py-4 text-[11px] font-mono text-sp-admin-text whitespace-pre-wrap leading-relaxed bg-sp-admin-hover/10 max-h-96 overflow-y-auto">
            {previewContent}
          </pre>
        </details>
      )}

      {/* Errores */}
      {(genError || state.error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] text-red-700 font-medium">
          ⚠ {genError ?? state.error}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-sp-admin-border/60">
        <button type="button" onClick={() => router.back()} className={BG}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => { void handleGenerate(); }}
          disabled={generating || !baseContent.trim()}
          className={BP}
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
              Generando PDF…
            </span>
          ) : '📄 Generar y guardar PDF'}
        </button>
      </div>
    </div>
  );
}
