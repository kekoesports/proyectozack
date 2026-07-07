/**
 * Tests i18n del generador de PDF de facturas.
 *
 * Verifica:
 *   - Diccionario ES mantiene labels actuales (no rompe PDFs previos).
 *   - Diccionario EN usa el copy propuesto (INVOICE, BILL TO, VAT, TOTAL, etc.).
 *   - Locale ES = es-ES, EN = en-GB.
 *   - resolvePdfLanguage aplica prioridad override > client.pdfLanguage > 'en'.
 *
 * Nota: el generador jsPDF requiere Canvas del navegador para renderizar, así
 * que estos tests validan el diccionario de strings y el resolver de idioma,
 * no el bytestream del PDF.
 */

// Mock jsPDF antes de importar el generador (evita cargar el bundle real)
jest.mock('jspdf', () => ({ jsPDF: jest.fn(() => ({})) }), { virtual: true });

// La única API pública que necesitamos testear del módulo son
// `resolvePdfLanguage` y el shape del diccionario STRINGS. Como STRINGS
// no está exportado, verificamos el output observable a través del
// bytestream del PDF sería costoso; en su lugar tests de contenido leen
// el fuente directamente para garantizar los literales exactos.

import * as fs from 'fs';
import * as path from 'path';
import { resolvePdfLanguage } from '@/lib/pdf/generateInvoicePdf';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const src = fs.readFileSync(
  path.join(PROJECT_ROOT, 'src/lib/pdf/generateInvoicePdf.ts'),
  'utf-8',
);

// ── Diccionario ES ─────────────────────────────────────────────────────

describe('generateInvoicePdf — diccionario ES compatible con lo previo', () => {
  it.each<[string, RegExp]>([
    ['título FACTURA',                  /invoiceTitle:\s*'FACTURA'/],
    ['título FACTURA RECTIFICATIVA',    /correctiveTitle:\s*'FACTURA RECTIFICATIVA'/],
    ['bloque EMPRESA EMISORA',          /issuerBlockLabel:\s*'EMPRESA EMISORA'/],
    ['bloque FACTURAR A',               /clientBlockLabel:\s*'FACTURAR A'/],
    ['label NIF',                       /issuerTaxIdLabel:\s*'NIF'/],
    ['label NIF\/VAT',                  /clientTaxIdLabel:\s*'NIF\/VAT'/],
    ['fecha emisión',                   /issueDate:\s*'Fecha de emisión'/],
    ['fecha vencimiento',               /dueDate:\s*'Fecha de vencimiento'/],
    ['label Moneda',                    /currency:\s*'Moneda'/],
    ['label Estado',                    /status:\s*'Estado'/],
    ['columnas CONCEPTO CANT. P. UNITARIO DTO. % SUBTOTAL',
      /colConcept:\s*'CONCEPTO'[\s\S]{0,200}colQty:\s*'CANT\.'[\s\S]{0,200}colUnitPrice:\s*'P\. UNITARIO'[\s\S]{0,200}colDiscount:\s*'DTO\. %'[\s\S]{0,200}colSubtotal:\s*'SUBTOTAL'/],
    ['base imponible',                  /subtotal:\s*'Base imponible'/],
    ['IVA con porcentaje',              /vat:\s*\(r: number\) => `IVA \(\$\{r\.toFixed\(0\)\}%\)`/],
    ['retención con porcentaje',        /withholding:\s*\(r: number\) => `Retención \(\$\{r\.toFixed\(0\)\}%\)`/],
    ['TOTAL',                           /es:[\s\S]*?total:\s*'TOTAL'/],
    ['DATOS DE PAGO',                   /paymentDetails:\s*'DATOS DE PAGO'/],
    ['BORRADOR statusLabel',            /borrador:\s*'BORRADOR'/],
    ['ANULADA statusLabel',             /es:[\s\S]*?anulada:\s*'ANULADA'/],
    ['locale es-ES',                    /es:[\s\S]*?locale:\s*'es-ES'/],
  ])('mantiene %s', (_desc, pattern) => {
    expect(src).toMatch(pattern);
  });
});

// ── Diccionario EN ─────────────────────────────────────────────────────

describe('generateInvoicePdf — diccionario EN es el copy aprobado', () => {
  it.each<[string, RegExp]>([
    ['título INVOICE',              /invoiceTitle:\s*'INVOICE'/],
    ['título CORRECTIVE INVOICE',   /correctiveTitle:\s*'CORRECTIVE INVOICE'/],
    ['bloque FROM',                 /issuerBlockLabel:\s*'FROM'/],
    ['bloque BILL TO',              /clientBlockLabel:\s*'BILL TO'/],
    ['label Tax ID',                /issuerTaxIdLabel:\s*'Tax ID'/],
    ['label Tax ID · VAT',          /clientTaxIdLabel:\s*'Tax ID · VAT'/],
    ['Issue Date',                  /issueDate:\s*'Issue Date'/],
    ['Due Date',                    /dueDate:\s*'Due Date'/],
    ['Currency',                    /en:[\s\S]*?currency:\s*'Currency'/],
    ['Status',                      /en:[\s\S]*?status:\s*'Status'/],
    ['columnas ITEM QTY UNIT PRICE DISC. % SUBTOTAL',
      /colConcept:\s*'ITEM'[\s\S]{0,200}colQty:\s*'QTY'[\s\S]{0,200}colUnitPrice:\s*'UNIT PRICE'[\s\S]{0,200}colDiscount:\s*'DISC\. %'[\s\S]{0,200}colSubtotal:\s*'SUBTOTAL'/],
    ['Subtotal',                    /en:[\s\S]*?subtotal:\s*'Subtotal'/],
    ['VAT con porcentaje',          /vat:\s*\(r: number\) => `VAT \(\$\{r\.toFixed\(0\)\}%\)`/],
    ['Withholding con porcentaje',  /withholding:\s*\(r: number\) => `Withholding \(\$\{r\.toFixed\(0\)\}%\)`/],
    ['TOTAL en EN',                 /en:[\s\S]*?total:\s*'TOTAL'/],
    ['PAYMENT DETAILS',             /paymentDetails:\s*'PAYMENT DETAILS'/],
    ['DRAFT statusLabel',           /en:[\s\S]*?borrador:\s*'DRAFT'/],
    ['PAID statusLabel',            /en:[\s\S]*?cobrada:\s*'PAID'/],
    ['OVERDUE statusLabel',         /en:[\s\S]*?vencida:\s*'OVERDUE'/],
    ['VOID statusLabel',            /en:[\s\S]*?anulada:\s*'VOID'/],
    ['AMENDED statusLabel',         /en:[\s\S]*?rectificada:\s*'AMENDED'/],
    ['locale en-GB',                /en:[\s\S]*?locale:\s*'en-GB'/],
    ['Deal',                        /en:[\s\S]*?deal:\s*'Deal'/],
    ['Brand',                       /en:[\s\S]*?brand:\s*'Brand'/],
    ['Creator',                     /en:[\s\S]*?creator:\s*'Creator'/],
  ])('usa %s', (_desc, pattern) => {
    expect(src).toMatch(pattern);
  });
});

// ── resolvePdfLanguage ─────────────────────────────────────────────────

describe('resolvePdfLanguage — prioridad override > client > default', () => {
  it('sin nada → default en', () => {
    expect(resolvePdfLanguage(null)).toBe('en');
    expect(resolvePdfLanguage(undefined)).toBe('en');
    expect(resolvePdfLanguage('')).toBe('en');
  });

  it('valor inválido en cliente → cae a default en', () => {
    expect(resolvePdfLanguage('fr')).toBe('en');
    expect(resolvePdfLanguage('EN')).toBe('en'); // solo lowercase
  });

  it('client=es sin override → es', () => {
    expect(resolvePdfLanguage('es')).toBe('es');
  });

  it('client=en sin override → en', () => {
    expect(resolvePdfLanguage('en')).toBe('en');
  });

  it('override tiene prioridad sobre client', () => {
    expect(resolvePdfLanguage('es', 'en')).toBe('en');
    expect(resolvePdfLanguage('en', 'es')).toBe('es');
    expect(resolvePdfLanguage(null, 'es')).toBe('es');
  });
});

// ── Schema billingClientSchema ─────────────────────────────────────────

describe('billingClientSchema — pdfLanguage', () => {
  it('acepta es/en y default en', async () => {
    const { billingClientSchema } = await import('@/lib/schemas/issuedInvoice');
    const parsed = billingClientSchema.safeParse({ name: 'Acme Inc' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pdfLanguage).toBe('en');
    }
  });

  it('acepta pdfLanguage=es explícito', async () => {
    const { billingClientSchema } = await import('@/lib/schemas/issuedInvoice');
    const parsed = billingClientSchema.safeParse({ name: 'Acme SL', pdfLanguage: 'es' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pdfLanguage).toBe('es');
    }
  });

  it('rechaza valores no soportados', async () => {
    const { billingClientSchema } = await import('@/lib/schemas/issuedInvoice');
    const parsed = billingClientSchema.safeParse({ name: 'Acme', pdfLanguage: 'fr' });
    expect(parsed.success).toBe(false);
  });
});

// ── InvoicePdfButton — override no muta el cliente ─────────────────────

describe('InvoicePdfButton — override no persiste', () => {
  it('el componente no llama a ninguna server action para persistir el idioma', () => {
    const btnSrc = fs.readFileSync(
      path.join(PROJECT_ROOT, 'src/features/admin/invoices/components/InvoicePdfButton.tsx'),
      'utf-8',
    );
    // No importa ni ejecuta ninguna action de actualización de cliente
    expect(btnSrc).not.toMatch(/updateBillingClientAction/);
    expect(btnSrc).not.toMatch(/updateBillingClient\b/);
    expect(btnSrc).not.toMatch(/setPdfLanguage/);
    // Sólo pasa el override como argumento a generateInvoicePdf
    expect(btnSrc).toMatch(/generateInvoicePdf\(invoice, issuer, client, override\)/);
  });
});

// ── Migración añade columna, no toca numeración ────────────────────────

describe('migración 0109 — pdf_language en billing_clients, sin tocar issued_invoices', () => {
  const sql = fs.readFileSync(
    path.join(PROJECT_ROOT, 'drizzle/0109_billing_clients_pdf_language.sql'),
    'utf-8',
  );

  it('añade columna pdf_language a billing_clients con default en', () => {
    expect(sql).toMatch(/ALTER TABLE\s+"billing_clients"[\s\S]*ADD COLUMN[\s\S]*"pdf_language"[\s\S]*varchar\(2\)[\s\S]*DEFAULT 'en'[\s\S]*NOT NULL/);
  });

  it('NO toca issued_invoices', () => {
    expect(sql).not.toMatch(/issued_invoices/);
  });

  it('NO toca issuer_companies', () => {
    expect(sql).not.toMatch(/issuer_companies/);
  });

  it('NO toca numeración', () => {
    expect(sql).not.toMatch(/next_invoice_number|next_rectification_number|invoice_series_prefix/);
  });

  it('es idempotente (IF NOT EXISTS)', () => {
    expect(sql).toMatch(/IF NOT EXISTS/);
  });
});
