'use client';

/**
 * Orquestador OCR ejecutado 100% en el navegador del admin.
 *
 * Flujo:
 *   1. Cargar pdfjs-dist y tesseract.js vía dynamic import (lazy).
 *   2. Renderizar cada página del PDF a un <canvas> en memoria.
 *   3. Pasar el canvas a Tesseract con el modelo `spa` (servido desde
 *      `/tessdata/spa.traineddata` en este origen — no hay CDN externa).
 *   4. Parsear el texto extraído con `parsePayrollOcrPage`.
 *
 * Privacidad:
 *   - El PDF nunca sale del navegador del usuario.
 *   - Solo se envía al server el array final `PayrollImportRow[]`
 *     cuando el usuario confirma en el preview.
 *   - No se loggea el texto OCR crudo (contiene PII).
 *
 * No usa `@/lib/env`, `@/lib/db` ni Server Actions.
 */

import { parsePayrollOcrPage } from './parseOcrText';
import type { PayrollImportRow } from '@/lib/finance/payroll/types';

export type OcrProgressEvent =
  | { readonly stage: 'render'; readonly page: number; readonly total: number }
  | { readonly stage: 'recognize'; readonly page: number; readonly total: number; readonly progress?: number };

export type RunClientOcrInput = {
  readonly file: File;
  readonly onProgress?: (e: OcrProgressEvent) => void;
};

export type RunClientOcrResult =
  | { readonly ok: true; readonly rows: PayrollImportRow[]; readonly pageCount: number }
  | { readonly ok: false; readonly error: string };

// Limitar páginas — nóminas ELEVATEX tienen 1-2. 3 = guard rail.
const MAX_PAGES = 3;
// Escala de renderizado para OCR. >=2 mejora reconocimiento de tablas.
const RENDER_SCALE = 2;

/**
 * Renderiza una página de PDF a un OffscreenCanvas (o canvas DOM) y
 * devuelve el ImageData listo para tesseract.
 */
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

/**
 * Ejecuta el flujo OCR completo sobre un archivo PDF.
 * Carga pdfjs y tesseract bajo demanda (dynamic import).
 *
 * Cualquier excepción se captura y se devuelve como `{ ok: false, error }`
 * — el wizard cae al modo manual sin tirar la página.
 */
export async function runClientOcr({ file, onProgress }: RunClientOcrInput): Promise<RunClientOcrResult> {
  try {
    // ── 1) pdfjs-dist ─────────────────────────────────────────────────────
    const pdfjs = await import('pdfjs-dist');
    // Worker servido desde el bundle de Next.js (mismo origen).
    // Si `workerSrc` no se setea, pdfjs intenta cargarlo de CDN y revienta CSP.
    // safe: import.meta.url existe en browser ESM
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    const totalPages = Math.min(pdfDoc.numPages, MAX_PAGES);

    // ── 2) Renderizar páginas a canvas ────────────────────────────────────
    const canvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < totalPages; i++) {
      onProgress?.({ stage: 'render', page: i + 1, total: totalPages });
      const canvas = await renderPageToCanvas(pdfDoc, i);
      canvases.push(canvas);
    }

    // ── 3) Tesseract con worker, modelo spa desde /tessdata ──────────────
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('spa', 1, {
      // Self-hosted en /public/tessdata/spa.traineddata (committed en repo).
      // No usamos CDN externo (privacidad + estabilidad).
      langPath: '/tessdata',
      // El archivo está comprimido en .gz → tesseract.js sabe descomprimirlo
      // automáticamente. Si guardamos sin comprimir cambiar a gzip: false.
      gzip: false,
      logger: () => {
        // No loggear texto OCR — contiene PII (nombres, importes).
      },
    });

    const rows: PayrollImportRow[] = [];
    try {
      for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i];
        if (!canvas) continue;
        onProgress?.({ stage: 'recognize', page: i + 1, total: totalPages });
        const { data } = await worker.recognize(canvas);
        const row = parsePayrollOcrPage(data.text, i + 1, file.name);
        rows.push(row);
      }
    } finally {
      await worker.terminate();
    }

    return { ok: true, rows, pageCount: totalPages };
  } catch (err) {
    // No exponer detalles técnicos en el mensaje del usuario.
    // El error real queda en el catch — el llamador (wizard) muestra un mensaje genérico.
    console.error('[client-ocr] error', err instanceof Error ? err.name : 'unknown');
    return { ok: false, error: 'No se pudo completar el OCR en tu navegador. Puedes introducir los datos manualmente.' };
  }
}
