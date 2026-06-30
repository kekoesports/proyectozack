'use client';

/**
 * Orquestador OCR ejecutado 100% en el navegador del admin.
 *
 * Todos los assets necesarios se sirven desde el mismo origen
 * (`/tessdata/`) — sin CDN externo. Esto evita violar la CSP
 * (`script-src 'self'`) y mantiene la privacidad.
 *
 * Archivos servidos desde public/tessdata/:
 *   - worker.min.js                          (tesseract.js orchestrator)
 *   - tesseract-core-simd-lstm.wasm[.js]     (engine WASM, OEM 1 + SIMD)
 *   - pdf.worker.min.mjs                     (pdfjs-dist worker)
 *   - spa.traineddata                        (modelo Tesseract español)
 *
 * Privacidad: el PDF nunca sale del navegador. Solo se envía al server
 * el array final `PayrollImportRow[]` cuando el usuario confirma en
 * el preview. No se loggea texto OCR (PII), nombres, importes, DNI.
 *
 * Diagnóstico: emite `console.log('[ocr] step=...', extra)` con datos
 * seguros (sin PII). El paso actual se incluye en el resultado de error
 * para que el wizard pueda mostrar detalle técnico colapsable.
 */

import { parsePayrollOcrPage } from './parseOcrText';
import type { PayrollImportRow } from '@/lib/finance/payroll/types';

// ── Paths self-hosted (vía /public/tessdata/) ───────────────────────────────

const TESSDATA_BASE = '/tessdata';
const PATHS = {
  pdfWorker:        `${TESSDATA_BASE}/pdf.worker.min.mjs`,
  tesseractWorker:  `${TESSDATA_BASE}/worker.min.js`,
  tesseractCore:    `${TESSDATA_BASE}/tesseract-core-simd-lstm.wasm.js`,
  langDir:          TESSDATA_BASE,
} as const;

// ── Tipos ───────────────────────────────────────────────────────────────────

export type OcrStep =
  | 'start'
  | 'dynamic-import-ok'
  | 'pdfjs-loaded'
  | 'worker-configured'
  | 'pdf-loaded'
  | 'render-page'
  | 'render-page-ok'
  | 'tesseract-import-ok'
  | 'tesseract-create-worker'
  | 'tesseract-worker-ready'
  | 'recognize-start'
  | 'recognize-ok'
  | 'parse-ok'
  | 'done';

export type OcrDebugInfo = {
  readonly step: OcrStep;
  readonly errorName: string;
  readonly errorMessage: string;
};

export type OcrProgressEvent =
  | { readonly stage: 'render'; readonly page: number; readonly total: number }
  | { readonly stage: 'recognize'; readonly page: number; readonly total: number; readonly progress?: number };

export type RunClientOcrInput = {
  readonly file: File;
  readonly onProgress?: (e: OcrProgressEvent) => void;
};

export type RunClientOcrResult =
  | { readonly ok: true; readonly rows: PayrollImportRow[]; readonly pageCount: number }
  | { readonly ok: false; readonly error: string; readonly debug: OcrDebugInfo };

// ── Constantes ──────────────────────────────────────────────────────────────

const MAX_PAGES = 3;
const RENDER_SCALE = 2;

// ── Logger seguro ───────────────────────────────────────────────────────────

function logStep(step: OcrStep, extra?: Record<string, unknown>): void {
  // safe: solo metadatos (número de páginas, longitudes, etc.). Nunca PII.
  if (extra) {
    console.log('[ocr] step=' + step, extra);
  } else {
    console.log('[ocr] step=' + step);
  }
}

// ── Helpers internos ────────────────────────────────────────────────────────

async function renderPageToCanvas(
  pdfDoc: { getPage: (i: number) => Promise<unknown> },
  pageIndex: number,
): Promise<HTMLCanvasElement> {
  // safe: solo se invoca tras dynamic import, garantizando que estamos en cliente
  const page = (await pdfDoc.getPage(pageIndex + 1)) as {
    getViewport: (o: { scale: number }) => { width: number; height: number };
    render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
  };
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_2d_context_unavailable');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

// ── Función principal ──────────────────────────────────────────────────────

export async function runClientOcr({ file, onProgress }: RunClientOcrInput): Promise<RunClientOcrResult> {
  let currentStep: OcrStep = 'start';
  try {
    logStep(currentStep);

    // ── 1) pdfjs-dist ────────────────────────────────────────────────────
    const pdfjs = await import('pdfjs-dist');
    currentStep = 'dynamic-import-ok';
    logStep(currentStep);

    pdfjs.GlobalWorkerOptions.workerSrc = PATHS.pdfWorker;
    currentStep = 'worker-configured';
    logStep(currentStep, { workerSrc: PATHS.pdfWorker });

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    const totalPages = Math.min(pdfDoc.numPages, MAX_PAGES);
    currentStep = 'pdf-loaded';
    logStep(currentStep, { pageCount: totalPages });

    // ── 2) Render páginas a canvas ───────────────────────────────────────
    const canvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < totalPages; i++) {
      currentStep = 'render-page';
      logStep(currentStep, { page: i + 1, of: totalPages });
      onProgress?.({ stage: 'render', page: i + 1, total: totalPages });
      const canvas = await renderPageToCanvas(pdfDoc, i);
      canvases.push(canvas);
      logStep('render-page-ok', { page: i + 1, w: canvas.width, h: canvas.height });
    }

    // ── 3) Tesseract self-hosted ─────────────────────────────────────────
    const { createWorker } = await import('tesseract.js');
    currentStep = 'tesseract-import-ok';
    logStep(currentStep);

    currentStep = 'tesseract-create-worker';
    logStep(currentStep, {
      workerPath: PATHS.tesseractWorker,
      corePath:   PATHS.tesseractCore,
      langPath:   PATHS.langDir,
    });
    const worker = await createWorker('spa', 1, {
      // Todo self-hosted: sin CDN externo, sin violar CSP.
      workerPath:    PATHS.tesseractWorker,
      workerBlobURL: false,
      corePath:      PATHS.tesseractCore,
      langPath:      PATHS.langDir,
      gzip:          false,
      // Logger silencioso — el texto OCR contiene PII. Solo log de progreso técnico.
      logger:        () => {},
    });
    currentStep = 'tesseract-worker-ready';
    logStep(currentStep);

    const rows: PayrollImportRow[] = [];
    try {
      for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i];
        if (!canvas) continue;
        currentStep = 'recognize-start';
        logStep(currentStep, { page: i + 1 });
        onProgress?.({ stage: 'recognize', page: i + 1, total: canvases.length });
        const { data } = await worker.recognize(canvas);
        const textLength = data.text?.length ?? 0;
        logStep('recognize-ok', { page: i + 1, textLength });
        const row = parsePayrollOcrPage(data.text, i + 1, file.name);
        rows.push(row);
      }
      currentStep = 'parse-ok';
      logStep(currentStep, { rows: rows.length });
    } finally {
      await worker.terminate();
    }

    currentStep = 'done';
    logStep(currentStep);
    return { ok: true, rows, pageCount: canvases.length };
  } catch (err) {
    const errorName    = err instanceof Error ? err.name    : 'UnknownError';
    const errorMessage = err instanceof Error ? err.message : String(err);
    // Truncar para evitar accidentes con stack que incluyan datos del PDF.
    const safeMessage = errorMessage.slice(0, 200);
    logStep('done', { failed: true, at: currentStep, errorName });
    console.error('[ocr] failed at=' + currentStep, errorName, safeMessage);
    return {
      ok: false,
      error: 'No se pudo completar el OCR en tu navegador. Puedes introducir los datos manualmente.',
      debug: { step: currentStep, errorName, errorMessage: safeMessage },
    };
  }
}
