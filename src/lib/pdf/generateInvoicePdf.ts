/**
 * Generador de PDF para facturas emitidas de SocialPro.
 * Usa jsPDF para crear un documento A4 profesional.
 * Solo se ejecuta en el cliente (no importar en server components).
 */
import type { IssuedInvoiceWithRelations, IssuerCompany, BillingClient } from '@/types';

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Constantes de diseño ──────────────────────────────────────────────

const PAGE_W  = 210; // A4 ancho mm
const PAGE_H  = 297; // A4 alto mm
const MARGIN  = 18;
const COL_R   = PAGE_W - MARGIN; // borde derecho
const LINE_H  = 5;   // altura de línea normal
const GRAY    = '#72728a';
const BLACK   = '#16161f';
const ACCENT  = '#f5632a';
const LIGHT   = '#eeeef5';

// ── Formatters ────────────────────────────────────────────────────────

function fmtMoney(n: string | number, currency = 'EUR'): string {
  const cur = ['EUR', 'USD', 'GBP', 'CHF'].includes(String(currency)) ? String(currency) : 'EUR';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(n));
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

// ── Status labels ─────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  borrador: 'BORRADOR',
  emitida:  'EMITIDA',
  enviada:  'ENVIADA',
  cobrada:  'COBRADA',
  vencida:  'VENCIDA',
  anulada:  'ANULADA',
};

// ── Main generator ────────────────────────────────────────────────────

export async function generateInvoicePdf(
  invoice:  IssuedInvoiceWithRelations,
  issuer:   IssuerCompany,
  client:   BillingClient,
): Promise<void> {
  // Import dinámico para evitar SSR
  const [{ jsPDF }, logoDataUrl] = await Promise.all([
    import('jspdf'),
    loadLogoDataUrl(),
  ]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const isRectificativa = !!invoice.rectifiedInvoiceId;
  let y = MARGIN;

  // ── Helpers internos ────────────────────────────────────────────────

  function setFont(size: number, style: 'normal' | 'bold' = 'normal', color = BLACK): void {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(color);
  }

  function hRule(yPos: number, color = LIGHT): void {
    doc.setDrawColor(color);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, yPos, COL_R, yPos);
  }

  function rect(x: number, yPos: number, w: number, h: number, fill: string): void {
    doc.setFillColor(fill);
    doc.setDrawColor(fill);
    doc.rect(x, yPos, w, h, 'F');
  }

  function splitText(text: string, maxWidth: number): string[] {
    const result: unknown = doc.splitTextToSize(text, maxWidth);
    return Array.isArray(result) ? result.map((s) => String(s)) : [String(result)];
  }

  // ── 1. HEADER ────────────────────────────────────────────────────────

  // Banda naranja superior
  rect(0, 0, PAGE_W, 2, ACCENT);

  // Logo o nombre de empresa (izquierda)
  if (logoDataUrl) {
    // Aspect ratio logo.png ~1.92:1 → 35×18mm
    doc.addImage(logoDataUrl, 'PNG', MARGIN, y + 1, 35, 18);
  } else {
    setFont(16, 'bold', ACCENT);
    doc.text(issuer.name, MARGIN, y + 8);
  }

  // "FACTURA [RECTIFICATIVA]" + número (derecha)
  const invoiceTitle = isRectificativa ? 'FACTURA RECTIFICATIVA' : 'FACTURA';
  setFont(isRectificativa ? 16 : 22, 'bold', isRectificativa ? '#7c3aed' : BLACK);
  doc.text(invoiceTitle, COL_R, y + 5, { align: 'right' });
  setFont(12, 'normal', GRAY);
  doc.text(invoice.invoiceNumber, COL_R, y + 11, { align: 'right' });
  if (isRectificativa && invoice.rectifiedInvoiceNumber) {
    setFont(8, 'normal', GRAY);
    doc.text(`Rectifica: ${invoice.rectifiedInvoiceNumber}`, COL_R, y + 16, { align: 'right' });
  }

  y += 22;
  hRule(y, '#e2e2ec');
  y += 4;

  // ── 2. BLOQUE EMISORA / CLIENTE ───────────────────────────────────────

  const colMid = PAGE_W / 2 + 2;

  // Datos emisora (izquierda)
  setFont(7, 'bold', GRAY);
  doc.text('EMPRESA EMISORA', MARGIN, y);
  y += 4;
  setFont(10, 'bold', BLACK);
  doc.text(issuer.legalName ?? issuer.name, MARGIN, y);
  setFont(9, 'normal', GRAY);
  if (issuer.taxId)    doc.text(`NIF: ${issuer.taxId}`,  MARGIN, y + 4);
  if (issuer.address)  doc.text(issuer.address,          MARGIN, y + 8);
  const issuerCity = [issuer.city, issuer.postalCode, issuer.country].filter(Boolean).join(', ');
  if (issuerCity)      doc.text(issuerCity,               MARGIN, y + 12);
  if (issuer.email)    doc.text(issuer.email,             MARGIN, y + 16);

  // Datos cliente (derecha)
  setFont(7, 'bold', GRAY);
  doc.text('FACTURAR A', colMid, y - 4);
  setFont(10, 'bold', BLACK);
  doc.text(client.legalName ?? client.name, colMid, y);
  setFont(9, 'normal', GRAY);
  if (client.taxId || client.vatNumber) {
    doc.text(`NIF/VAT: ${client.taxId ?? client.vatNumber}`, colMid, y + 4);
  }
  if (client.address)  doc.text(client.address, colMid, y + 8);
  const clientCity = [client.city, client.postalCode, client.country].filter(Boolean).join(', ');
  if (clientCity)      doc.text(clientCity, colMid, y + 12);
  if (client.email)    doc.text(client.email, colMid, y + 16);

  y += 24;
  hRule(y, '#e2e2ec');
  y += 5;

  // ── 3. METADATOS ──────────────────────────────────────────────────────

  const metaFields = [
    ['Fecha de emisión',  fmtDate(invoice.issueDate)],
    ['Fecha de vencimiento', invoice.dueDate ? fmtDate(invoice.dueDate) : '—'],
    ['Moneda',            invoice.currency ?? 'EUR'],
    ['Estado',            STATUS_LABELS[invoice.status] ?? invoice.status.toUpperCase()],
  ] as const;

  const metaColW = (PAGE_W - MARGIN * 2) / metaFields.length;
  metaFields.forEach(([label, value], i) => {
    const x = MARGIN + i * metaColW;
    setFont(7, 'bold', GRAY);
    doc.text(label, x, y);
    setFont(10, 'bold', invoice.status === 'vencida' && label === 'Estado' ? '#ef4444' : BLACK);
    doc.text(String(value), x, y + 4.5);
  });

  y += 12;
  hRule(y, '#e2e2ec');
  y += 5;

  // ── 4a. DATOS RECTIFICATIVA ───────────────────────────────────────────

  if (isRectificativa) {
    rect(MARGIN - 2, y - 2, PAGE_W - MARGIN * 2 + 4, 14, '#f3f0ff');
    setFont(7, 'bold', '#7c3aed');
    doc.text('FACTURA RECTIFICATIVA', MARGIN, y + 1.5);
    setFont(8.5, 'normal', BLACK);
    if (invoice.rectifiedInvoiceNumber) {
      doc.text(`Rectifica la factura: ${invoice.rectifiedInvoiceNumber}`, MARGIN, y + 6);
    }
    if (invoice.rectificationType) {
      const typeLabel = invoice.rectificationType === 'sustitutiva' ? 'Sustitutiva' : 'Por diferencia';
      doc.text(`Tipo: ${typeLabel}`, COL_R, y + 6, { align: 'right' });
    }
    if (invoice.rectificationReason) {
      setFont(8, 'normal', GRAY);
      const reasonLines = splitText(`Motivo: ${invoice.rectificationReason}`, PAGE_W - MARGIN * 2);
      doc.text(reasonLines[0] ?? '', MARGIN, y + 11);
    }
    y += 18;
  }

  // ── 4. TRATO / RELACIÓN CRM ───────────────────────────────────────────

  if (invoice.dealName ?? invoice.brandName) {
    rect(MARGIN - 2, y - 2, PAGE_W - MARGIN * 2 + 4, 7, LIGHT);
    setFont(8, 'normal', GRAY);
    const crmRef = [
      invoice.dealName ? `Trato: ${invoice.dealName}` : null,
      invoice.brandName ? `Marca: ${invoice.brandName}` : null,
      invoice.talentName ? `Talento: ${invoice.talentName}` : null,
    ].filter(Boolean).join('  ·  ');
    doc.text(crmRef, MARGIN, y + 2.5);
    y += 10;
  }

  // ── 5. TABLA DE LÍNEAS ────────────────────────────────────────────────

  // Cabecera tabla
  rect(MARGIN - 2, y - 1, PAGE_W - MARGIN * 2 + 4, 7, ACCENT);
  setFont(8, 'bold', '#ffffff');
  const colsX = { concept: MARGIN, qty: 115, price: 140, disc: 162, sub: COL_R };
  doc.text('CONCEPTO',       colsX.concept, y + 3.5);
  doc.text('CANT.',          colsX.qty,     y + 3.5, { align: 'right' });
  doc.text('P. UNITARIO',    colsX.price,   y + 3.5, { align: 'right' });
  doc.text('DTO. %',         colsX.disc,    y + 3.5, { align: 'right' });
  doc.text('SUBTOTAL',       colsX.sub,     y + 3.5, { align: 'right' });
  y += 9;

  // Filas de líneas
  const lines = invoice.lines ?? [];
  if (lines.length === 0) {
    setFont(9, 'normal', GRAY);
    doc.text('Sin líneas de factura registradas.', MARGIN, y + 4);
    y += 8;
  } else {
    lines.forEach((line, idx) => {
      if (idx % 2 === 1) rect(MARGIN - 2, y - 1, PAGE_W - MARGIN * 2 + 4, 8, '#f5f5f7');

      setFont(9, 'bold', BLACK);
      const conceptLines = splitText(line.concept, 82);
      doc.text(conceptLines[0] ?? line.concept, colsX.concept, y + 3.5);
      if (line.description) {
        setFont(7.5, 'normal', GRAY);
        doc.text(line.description.slice(0, 90), colsX.concept, y + 7);
      }

      setFont(9, 'normal', BLACK);
      doc.text(String(Number(line.quantity).toFixed(2)), colsX.qty, y + 3.5, { align: 'right' });
      doc.text(fmtMoney(line.unitPrice, invoice.currency), colsX.price, y + 3.5, { align: 'right' });
      doc.text(
        Number(line.discount) > 0 ? `${Number(line.discount).toFixed(0)}%` : '—',
        colsX.disc, y + 3.5, { align: 'right' },
      );
      setFont(9, 'bold', BLACK);
      doc.text(fmtMoney(line.subtotal, invoice.currency), colsX.sub, y + 3.5, { align: 'right' });

      y += line.description ? 10 : 8;
    });
  }

  hRule(y, '#e2e2ec');
  y += 4;

  // ── 6. TOTALES ────────────────────────────────────────────────────────

  const totalsX = 120;
  const totalsW = COL_R - totalsX;

  const totals: [string, string, boolean][] = [
    ['Base imponible',   fmtMoney(invoice.netAmount, invoice.currency),         false],
    [`IVA (${Number(invoice.vatRate ?? 0).toFixed(0)}%)`, fmtMoney(invoice.vatAmount, invoice.currency), false],
  ];

  if (Number(invoice.withholdingRate ?? 0) > 0) {
    totals.push([
      `Retención (${Number(invoice.withholdingRate).toFixed(0)}%)`,
      `-${fmtMoney(invoice.withholdingAmount, invoice.currency)}`,
      false,
    ]);
  }

  totals.forEach(([label, value]) => {
    setFont(9, 'normal', GRAY);
    doc.text(label, totalsX, y);
    setFont(9, 'normal', BLACK);
    doc.text(value, COL_R, y, { align: 'right' });
    y += LINE_H;
  });

  y += 1;
  rect(totalsX - 2, y - 1, totalsW + 4, 9, ACCENT);
  setFont(11, 'bold', '#ffffff');
  doc.text('TOTAL', totalsX, y + 5);
  doc.text(fmtMoney(invoice.totalAmount, invoice.currency), COL_R, y + 5, { align: 'right' });
  y += 13;

  // ── 7. DATOS DE PAGO ──────────────────────────────────────────────────

  if (issuer.bankDetails || issuer.cryptoDetails || invoice.paymentTerms) {
    setFont(8, 'bold', GRAY);
    doc.text('DATOS DE PAGO', MARGIN, y);
    y += 4;

    if (invoice.paymentTerms) {
      setFont(8.5, 'normal', GRAY);
      const terms = splitText(invoice.paymentTerms, PAGE_W - MARGIN * 2);
      doc.text(terms, MARGIN, y);
      y += terms.length * 4;
    }

    if (issuer.bankDetails) {
      setFont(8.5, 'normal', BLACK);
      const bankLines = splitText(issuer.bankDetails, PAGE_W - MARGIN * 2);
      doc.text(bankLines, MARGIN, y);
      y += bankLines.length * 4 + 1;
    }

    if (issuer.cryptoDetails) {
      setFont(8.5, 'normal', GRAY);
      const cryptoLines = splitText(`Crypto: ${issuer.cryptoDetails}`, PAGE_W - MARGIN * 2);
      doc.text(cryptoLines, MARGIN, y);
      y += cryptoLines.length * 4 + 1;
    }

    y += 2;
  }

  // ── 8. NOTA LEGAL ─────────────────────────────────────────────────────

  const legalText = invoice.legalNote ?? issuer.notes;
  if (legalText) {
    hRule(y, '#e2e2ec');
    y += 4;
    setFont(7.5, 'normal', GRAY);
    const legal = splitText(legalText, PAGE_W - MARGIN * 2);
    doc.text(legal, MARGIN, y);
    y += legal.length * 3.5 + 2;
  }

  // ── 9. FOOTER ─────────────────────────────────────────────────────────

  rect(0, PAGE_H - 8, PAGE_W, 8, '#1e2235');
  setFont(7, 'normal', '#c4c4d8');
  doc.text(
    `${issuer.name}${issuer.taxId ? ` · ${issuer.taxId}` : ''}${issuer.city ? ` · ${issuer.city}` : ''}`,
    PAGE_W / 2,
    PAGE_H - 3,
    { align: 'center' },
  );

  // ── 10. MARCAS DE AGUA ────────────────────────────────────────────────

  if (invoice.status === 'borrador' || invoice.status === 'anulada' || invoice.status === 'rectificada') {
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(invoice.status === 'rectificada' ? 40 : 60);
    doc.setFont('helvetica', 'bold');
    doc.setGState(doc.GState({ opacity: 0.12 }));
    const watermarkText = invoice.status === 'borrador' ? 'BORRADOR'
      : invoice.status === 'anulada' ? 'ANULADA'
      : 'RECTIFICADA';
    doc.text(watermarkText, PAGE_W / 2, PAGE_H / 2, { angle: 45, align: 'center' });
    doc.setGState(doc.GState({ opacity: 1.0 }));
  }

  // ── Guardar ───────────────────────────────────────────────────────────

  const fileName = `${invoice.invoiceNumber.replace(/[/\\]/g, '-')}.pdf`;
  doc.save(fileName);
}
