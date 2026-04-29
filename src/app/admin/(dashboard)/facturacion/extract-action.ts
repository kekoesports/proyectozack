'use server';

import type { ExtractedInvoiceData, ExtractionResult } from '@/types';

const SUPPORTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function extractInvoiceAction(formData: FormData): Promise<ExtractionResult> {
  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) {
    return { error: 'No se ha proporcionado ningún archivo' };
  }
  if (!SUPPORTED_MIME.includes(file.type)) {
    return { error: 'Formato no soportado para extracción automática. Usa PDF, JPG o PNG.' };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: 'El archivo supera el límite de 10 MB' };
  }

  // ── Phase 1: mock ────────────────────────────────────────────────
  // Phase 2: sustituir por llamada a OpenAI Vision / Google Document AI / AWS Textract
  return mockExtract(file.name, file.size);
}

async function mockExtract(filename: string, _size: number): Promise<ExtractionResult> {
  // Simular latencia de procesamiento OCR
  await new Promise<void>((r) => setTimeout(r, 1400 + Math.random() * 400));

  const lower = filename.toLowerCase();

  // Inferir tipo desde el nombre de archivo
  const looksLikeExpense =
    lower.includes('gasto') ||
    lower.includes('proveedor') ||
    lower.includes('compra') ||
    lower.includes('recibo') ||
    lower.includes('receipt') ||
    lower.includes('bill');

  const today = new Date();
  const due   = new Date(today);
  due.setDate(due.getDate() + 30);

  const year  = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const seq   = String(Math.floor(Math.random() * 899) + 100);

  const net   = parseFloat((Math.random() * 4500 + 300).toFixed(2));
  const vat   = looksLikeExpense ? 21 : 21;
  const total = parseFloat((net * (1 + vat / 100)).toFixed(2));

  const data: ExtractedInvoiceData = {
    type:           looksLikeExpense ? 'expense' : 'income',
    concept:        looksLikeExpense
      ? 'Servicios profesionales externos'
      : 'Campaña de publicidad digital',
    description:    looksLikeExpense
      ? 'Factura de proveedor de servicios. Verifica el concepto.'
      : 'Factura emitida por activación con influencer. Verifica el importe.',
    ...(looksLikeExpense
      ? { supplierName: 'Proveedor Ejemplo S.L.', customerName: 'SocialPro España S.L.' }
      : { customerName: 'Cliente Ejemplo S.A.' }),
    taxId:          looksLikeExpense ? 'B12345678' : 'A87654321',
    invoiceNumber:  `${looksLikeExpense ? 'F' : 'SP'}-${year}/${month}-${seq}`,
    issueDate:      today.toISOString().slice(0, 10),
    dueDate:        due.toISOString().slice(0, 10),
    netAmount:      net,
    vatRate:        vat,
    withholdingRate: 0,
    totalAmount:    total,
    currency:       'EUR',
    ...(looksLikeExpense
      ? { paymentMethod: 'Transferencia bancaria', iban: 'ES91 2100 0418 4502 0005 1332' }
      : {}),
    confidence: parseFloat((0.62 + Math.random() * 0.28).toFixed(2)),
  };

  return { data };
}
