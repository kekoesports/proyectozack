'use client';

import { useActionState, useMemo, useState } from 'react';
import { saveGeneratedContractAction } from '@/app/admin/(dashboard)/campanas/generate-contract-action';
import { fillTemplate, AVAILABLE_VARIABLES } from '@/lib/contractVariables';
import type { ContractTemplate } from '@/lib/queries/contractTemplates';
import type { CampaignWithRelations } from '@/lib/queries/campaigns';

type Props = {
  readonly campaign:  CampaignWithRelations;
  readonly templates: readonly ContractTemplate[];
  readonly vars:      Record<string, string>;
  readonly onDone:    () => void;
};

const I  = 'w-full rounded-lg border border-sp-admin-border bg-white px-3 py-2 text-[13px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const LB = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';
const BP = 'px-4 py-2 rounded-lg text-sm font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors';
const BG = 'px-3 py-1.5 rounded-lg text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover border border-sp-admin-border transition-colors';

export function ContractGenerator({ campaign, templates, vars, onDone }: Props): React.ReactElement {
  const [selectedTemplateId, setTemplateId] = useState<number>(templates[0]?.id ?? 0);
  const [editedContent,      setContent]    = useState<string | null>(null);
  const [generating,         setGenerating] = useState(false);
  const [genError,           setGenError]   = useState<string | null>(null);
  const [state, formAction] = useActionState(saveGeneratedContractAction, {});

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const previewContent = useMemo(() => {
    const base = editedContent ?? selectedTemplate?.content ?? '';
    return fillTemplate(base, vars);
  }, [editedContent, selectedTemplate, vars]);

  function onTemplateChange(id: number): void {
    setTemplateId(id);
    setContent(null); // reset edits when changing template
  }

  async function handleGenerate(): Promise<void> {
    setGenerating(true);
    setGenError(null);
    try {
      const { jsPDF } = await import('jspdf');

      // ── Constantes de diseño (mismas que generateInvoicePdf) ──────────
      const PAGE_W  = 210;
      const PAGE_H  = 297;
      const MARGIN  = 20;
      const COL_R   = PAGE_W - MARGIN;
      const CONTENT_BOTTOM = PAGE_H - 16; // espacio para footer
      const ACCENT  = '#f5632a';
      const GRAY    = '#72728a';
      const BLACK   = '#16161f';
      const LIGHT   = '#f5f5fa';
      const BORDER  = '#e2e2ec';

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let y = 0;
      let pageNum = 1;

      // ── Helpers ──────────────────────────────────────────────────────
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
        // Banda naranja superior
        fillRect(0, 0, PAGE_W, 2.5, ACCENT);

        // Logo de texto "SocialPro"
        sf(15, 'bold', ACCENT);
        doc.text('SocialPro', MARGIN, 11);

        // Etiqueta "CONTRATO" a la derecha
        sf(11, 'bold', BLACK);
        doc.text('CONTRATO', COL_R, 9, { align: 'right' });
        sf(8, 'normal', GRAY);
        doc.text(selectedTemplate?.name ?? 'Contrato de servicios', COL_R, 14, { align: 'right' });

        y = 20;
        hLine(y, BORDER);
        y += 6;
      }

      function addFooter(): void {
        hLine(PAGE_H - 13, BORDER);
        sf(7, 'normal', GRAY);
        doc.text('SocialPro · Contrato de servicios', MARGIN, PAGE_H - 9);
        doc.text(`Pág. ${pageNum}`, COL_R, PAGE_H - 9, { align: 'right' });
        const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        doc.text(today, PAGE_W / 2, PAGE_H - 9, { align: 'center' });
      }

      function checkPage(needed = 6): void {
        if (y + needed > CONTENT_BOTTOM) {
          addFooter();
          doc.addPage();
          pageNum++;
          addHeader();
        }
      }

      // ── Página 1: cabecera ────────────────────────────────────────────
      addHeader();

      // Bloque de datos del trato (mini tabla 2 columnas)
      const metaRows: [string, string][] = [
        ['Trato', campaign.name],
        ['Marca',  vars['brand_name']    ?? '—'],
        ['Talento', vars['influencer_name'] ?? '—'],
        ['Importe',  vars['total_amount']   ?? '—'],
        ['Fecha inicio', vars['start_date'] ?? '—'],
        ['Fecha fin',    vars['end_date']   ?? '—'],
      ].filter(([, v]) => v !== '—') as [string, string][];

      const colMid = PAGE_W / 2 + 2;
      const half   = metaRows.slice(0, Math.ceil(metaRows.length / 2));
      const second = metaRows.slice(Math.ceil(metaRows.length / 2));
      const startY = y;

      for (let i = 0; i < Math.max(half.length, second.length); i++) {
        const l = half[i];
        const r = second[i];
        if (l) {
          sf(7, 'bold', GRAY); doc.text(l[0].toUpperCase(), MARGIN, y);
          sf(9, 'normal', BLACK); doc.text(l[1], MARGIN + 28, y);
        }
        if (r) {
          sf(7, 'bold', GRAY); doc.text(r[0].toUpperCase(), colMid, y);
          sf(9, 'normal', BLACK); doc.text(r[1], colMid + 28, y);
        }
        y += 5;
      }

      if (y > startY) { y += 3; hLine(y, '#ebebf5'); y += 7; }

      // ── Contenido del contrato ────────────────────────────────────────
      const lines = previewContent.split('\n');
      for (const rawLine of lines) {
        const trimmed    = rawLine.trim();
        const isSep      = /^[=\-]{3,}/.test(trimmed);
        const isTitle    = /^[A-ZÁÉÍÓÚ\d\s\.]{3,}$/.test(trimmed) && trimmed.length > 2 && trimmed.length < 70;
        const isEmpty    = trimmed === '';

        if (isEmpty)   { y += 2.5; continue; }
        if (isSep)     { checkPage(5); hLine(y, '#d8d8e8'); y += 5; continue; }

        if (isTitle) {
          checkPage(12);
          fillRect(MARGIN, y - 3.5, COL_R - MARGIN, 7, LIGHT);
          sf(10, 'bold', ACCENT);
          doc.text(trimmed, MARGIN + 3, y);
          y += 9;
        } else {
          const wrapped = doc.splitTextToSize(rawLine, COL_R - MARGIN - 2);
          for (const wline of wrapped) {
            checkPage(6);
            sf(9.5, 'normal', BLACK);
            doc.text(wline, MARGIN, y);
            y += 5.5;
          }
        }
      }

      // Footer de última página
      addFooter();

      // ── Guardar ───────────────────────────────────────────────────────
      const pdfBytes = doc.output('arraybuffer');
      const pdfBlob  = new Blob([pdfBytes], { type: 'application/pdf' });
      const fileName = `contrato-${campaign.name.replace(/[^\w]/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;

      const fd = new FormData();
      fd.append('pdf',        new File([pdfBlob], fileName, { type: 'application/pdf' }));
      fd.append('campaignId', String(campaign.id));
      fd.append('templateId', String(selectedTemplateId));
      fd.append('fileName',   fileName);

      formAction(fd);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  }

  if (state.success) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
        <p className="text-2xl">✓</p>
        <p className="font-bold text-emerald-800">Contrato generado y guardado</p>
        <p className="text-[12px] text-emerald-600">
          El PDF se ha subido y asociado al trato. Ya puedes añadir firmantes.
        </p>
        <button type="button" onClick={onDone} className={BP}>Ver contrato →</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Selector de plantilla */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-2">
          <label className={LB}>Plantilla *</label>
          <select value={selectedTemplateId} onChange={(e) => onTemplateChange(Number(e.target.value))} className={I}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => setContent(null)}
          className={`${BG} h-10`} title="Deshacer ediciones">
          Restablecer plantilla
        </button>
      </div>

      {/* Referencia de variables */}
      <details className="rounded-xl border border-sp-admin-border overflow-hidden">
        <summary className="px-4 py-2.5 text-[11px] font-semibold text-sp-admin-muted cursor-pointer hover:bg-sp-admin-hover/30 select-none bg-sp-admin-hover/20">
          Variables disponibles — haz clic para ver
        </summary>
        <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {AVAILABLE_VARIABLES.map((v) => (
            <div key={v.key} className="flex items-baseline gap-2">
              <code className="text-[10px] font-mono text-sp-admin-accent bg-sp-admin-accent/10 px-1.5 rounded">{`{{${v.key}}}`}</code>
              <span className="text-[10px] text-sp-admin-muted truncate">{v.label}</span>
            </div>
          ))}
        </div>
        <div className="px-4 pb-3 text-[10px] text-sp-admin-muted/60">
          Valores actuales del trato: {Object.entries(vars).filter(([, v]) => v !== '—').slice(0, 5).map(([k, v]) => `${k}="${v}"`).join(' · ')}
        </div>
      </details>

      {/* Editor de plantilla */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={LB}>Plantilla editable</label>
          <span className="text-[9px] text-sp-admin-muted/60">Puedes modificar el texto antes de generar</span>
        </div>
        <textarea
          rows={20}
          value={editedContent ?? (selectedTemplate?.content ?? '')}
          onChange={(e) => setContent(e.target.value)}
          className={`${I} font-mono text-[11px] leading-relaxed resize-y`}
          spellCheck={false}
        />
      </div>

      {/* Preview rellena */}
      <details className="rounded-xl border border-sp-admin-border overflow-hidden">
        <summary className="px-4 py-2.5 text-[11px] font-semibold text-sp-admin-muted cursor-pointer hover:bg-sp-admin-hover/30 select-none bg-sp-admin-hover/20">
          Preview con datos reales — haz clic para ver
        </summary>
        <pre className="px-5 py-4 text-[11px] font-mono text-sp-admin-text whitespace-pre-wrap leading-relaxed bg-sp-admin-hover/10 max-h-96 overflow-y-auto">
          {previewContent}
        </pre>
      </details>

      {/* Errores */}
      {(genError || state.error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] text-red-700 font-medium">
          ⚠ {genError || state.error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-between pt-2 border-t border-sp-admin-border/60">
        <button type="button" onClick={onDone} className={BG}>Cancelar</button>
        <button type="button" onClick={() => { void handleGenerate(); }} disabled={generating || !selectedTemplate}
          className={BP}>
          {generating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
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
