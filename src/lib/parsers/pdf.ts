// Runs server-side only. Uses pdfjs-dist to extract positioned text items
// from a PDF buffer. No rendering, no canvas — text layer only.

// pdfjs-dist v5 main build uses DOMMatrix (browser-only). Use legacy build for Node.js.
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

export type PdfTextItem = {
  readonly str: string;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fontSize: number;
};

export type PdfExtract = {
  readonly pageCount: number;
  readonly items: readonly PdfTextItem[];
  readonly text: string;
  readonly pageSizes: readonly { readonly width: number; readonly height: number }[];
};

// Disable the worker in server env — pdfjs will run in-process.
// Setting workerSrc to an empty string forces fake worker mode.
if (typeof window === 'undefined') {
  GlobalWorkerOptions.workerSrc = '';
}

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return 'str' in item && 'transform' in item;
}

export async function extractPdfText(buffer: ArrayBuffer | Uint8Array): Promise<PdfExtract> {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const loadingTask = getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
    isEvalSupported: false,
  });
  const doc = await loadingTask.promise;

  const items: PdfTextItem[] = [];
  const pageSizes: { width: number; height: number }[] = [];
  let fullText = '';

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    pageSizes.push({ width: viewport.width, height: viewport.height });

    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!isTextItem(item)) continue;
      const str = item.str;
      if (!str) continue;

      // transform = [a, b, c, d, e, f] where (e, f) is the position
      // and sqrt(a*a+b*b) ~ font size at the PDF's own scale.
      const [a, b, , , e, f] = item.transform as [number, number, number, number, number, number];
      const fontSize = Math.hypot(a, b);
      // PDF y-axis origin is bottom-left. Flip to top-left for human-friendly math.
      const yTopDown = viewport.height - f;

      items.push({
        str,
        page: pageNum,
        x: e,
        y: yTopDown,
        width: item.width ?? 0,
        height: item.height ?? fontSize,
        fontSize,
      });

      fullText += str;
      if (item.hasEOL) fullText += '\n';
      else fullText += ' ';
    }
    fullText += '\n';

    page.cleanup();
  }

  await doc.destroy();

  return { pageCount: doc.numPages, items, text: fullText, pageSizes };
}

export type TextLine = {
  readonly page: number;
  readonly y: number;
  readonly items: readonly PdfTextItem[];
  readonly text: string;
};

const LINE_TOLERANCE = 2; // pixels; group items within 2px vertically as one line.

export function groupIntoLines(items: readonly PdfTextItem[]): readonly TextLine[] {
  const sorted = [...items].sort((a, b) => (a.page - b.page) || (a.y - b.y) || (a.x - b.x));
  const lines: TextLine[] = [];
  let currentPage = -1;
  let currentY = Number.NEGATIVE_INFINITY;
  let bucket: PdfTextItem[] = [];

  const flush = (): void => {
    const head = bucket[0];
    if (!head) return;
    const sortedByX = [...bucket].sort((a, b) => a.x - b.x);
    lines.push({
      page: head.page,
      y: head.y,
      items: sortedByX,
      text: sortedByX.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim(),
    });
    bucket = [];
  };

  for (const it of sorted) {
    if (it.page !== currentPage || Math.abs(it.y - currentY) > LINE_TOLERANCE) {
      flush();
      currentPage = it.page;
      currentY = it.y;
    }
    bucket.push(it);
  }
  flush();

  return lines;
}
