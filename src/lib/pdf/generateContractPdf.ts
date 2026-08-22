import 'server-only';

export type ContractPdfMetadata = {
  readonly label: string;
  readonly value: string;
};

export type GenerateContractPdfInput = {
  readonly templateName: string;
  readonly content: string;
  readonly metadata: readonly ContractPdfMetadata[];
  readonly generatedAt?: Date;
};

/**
 * Genera el PDF de un contrato en el servidor.
 *
 * El generador histórico vive dentro de un componente cliente. Este módulo no
 * toca DOM, Canvas ni APIs del navegador, por lo que también funciona en el
 * worker HTTP del VPS y permite crear borradores desde una automatización.
 */
export async function generateContractPdf(
  input: GenerateContractPdfInput,
): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 20;
  const COL_R = PAGE_W - MARGIN;
  const CONTENT_BOTTOM = PAGE_H - 16;
  const ACCENT = '#f5632a';
  const GRAY = '#72728a';
  const BLACK = '#16161f';
  const LIGHT = '#f5f5fa';
  const BORDER = '#e2e2ec';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 0;
  let pageNum = 1;

  function setFont(size: number, style: 'normal' | 'bold' = 'normal', color = BLACK): void {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(color);
  }

  function fillRect(x: number, top: number, width: number, height: number, fill: string): void {
    doc.setFillColor(fill);
    doc.setDrawColor(fill);
    doc.rect(x, top, width, height, 'F');
  }

  function hLine(top: number, color = BORDER): void {
    doc.setDrawColor(color);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, top, COL_R, top);
  }

  function addHeader(): void {
    fillRect(0, 0, PAGE_W, 2.5, ACCENT);
    setFont(15, 'bold', ACCENT);
    doc.text('SocialPro', MARGIN, 11);
    setFont(11, 'bold', BLACK);
    doc.text('CONTRATO · BORRADOR', COL_R, 9, { align: 'right' });
    setFont(8, 'normal', GRAY);
    doc.text(input.templateName, COL_R, 14, { align: 'right' });
    y = 20;
    hLine(y);
    y += 6;
  }

  function addFooter(): void {
    hLine(PAGE_H - 13);
    setFont(7, 'normal', GRAY);
    doc.text('SocialPro · Borrador pendiente de revisión', MARGIN, PAGE_H - 9);
    doc.text(`Pág. ${pageNum}`, COL_R, PAGE_H - 9, { align: 'right' });
    const date = (input.generatedAt ?? new Date()).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    doc.text(date, PAGE_W / 2, PAGE_H - 9, { align: 'center' });
  }

  function checkPage(needed = 6): void {
    if (y + needed <= CONTENT_BOTTOM) return;
    addFooter();
    doc.addPage();
    pageNum++;
    addHeader();
  }

  addHeader();

  const metadata = input.metadata.filter((row) => row.value.trim().length > 0 && row.value !== '—');
  if (metadata.length > 0) {
    const midpoint = Math.ceil(metadata.length / 2);
    const left = metadata.slice(0, midpoint);
    const right = metadata.slice(midpoint);
    const columnMid = PAGE_W / 2 + 2;
    const startY = y;

    for (let i = 0; i < Math.max(left.length, right.length); i++) {
      const leftRow = left[i];
      const rightRow = right[i];
      if (leftRow) {
        setFont(7, 'bold', GRAY);
        doc.text(leftRow.label.toUpperCase(), MARGIN, y);
        setFont(9, 'normal', BLACK);
        doc.text(leftRow.value, MARGIN + 28, y);
      }
      if (rightRow) {
        setFont(7, 'bold', GRAY);
        doc.text(rightRow.label.toUpperCase(), columnMid, y);
        setFont(9, 'normal', BLACK);
        doc.text(rightRow.value, columnMid + 28, y);
      }
      y += 5;
    }

    if (y > startY) {
      y += 3;
      hLine(y, '#ebebf5');
      y += 7;
    }
  }

  for (const rawLine of input.content.split('\n')) {
    const trimmed = rawLine.trim();
    const isSeparator = /^[=\-]{3,}/.test(trimmed);
    const isTitle = /^[A-ZÁÉÍÓÚÜÑ\d\s.]{3,}$/.test(trimmed)
      && trimmed.length > 2
      && trimmed.length < 70;

    if (trimmed === '') {
      y += 2.5;
      continue;
    }
    if (isSeparator) {
      checkPage(5);
      hLine(y, '#d8d8e8');
      y += 5;
      continue;
    }
    if (isTitle) {
      checkPage(12);
      fillRect(MARGIN, y - 3.5, COL_R - MARGIN, 7, LIGHT);
      setFont(10, 'bold', ACCENT);
      doc.text(trimmed, MARGIN + 3, y);
      y += 9;
      continue;
    }

    const wrappedRaw: unknown = doc.splitTextToSize(rawLine, COL_R - MARGIN - 2);
    const wrapped = Array.isArray(wrappedRaw)
      ? wrappedRaw.map((line) => String(line))
      : [String(wrappedRaw)];
    for (const line of wrapped) {
      checkPage(6);
      setFont(9.5, 'normal', BLACK);
      doc.text(line, MARGIN, y);
      y += 5.5;
    }
  }

  addFooter();
  return Buffer.from(doc.output('arraybuffer'));
}
