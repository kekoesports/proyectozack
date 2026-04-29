import { z } from 'zod';

export const ISSUED_INVOICE_STATUSES = ['borrador', 'emitida', 'enviada', 'cobrada', 'vencida', 'anulada'] as const;

export const BILLING_CLIENT_TYPES = [
  'empresa_espana', 'empresa_ue', 'empresa_fuera_ue',
  'creador_espana', 'creador_extranjero', 'particular', 'otro',
] as const;

export const BILLING_CLIENT_TYPE_LABELS: Record<typeof BILLING_CLIENT_TYPES[number], string> = {
  empresa_espana:      'Empresa España',
  empresa_ue:          'Empresa UE',
  empresa_fuera_ue:    'Empresa fuera UE',
  creador_espana:      'Creador España',
  creador_extranjero:  'Creador extranjero',
  particular:          'Particular',
  otro:                'Otro',
};

export const ISSUED_INVOICE_STATUS_LABELS: Record<typeof ISSUED_INVOICE_STATUSES[number], string> = {
  borrador: 'Borrador',
  emitida:  'Emitida',
  enviada:  'Enviada',
  cobrada:  'Cobrada',
  vencida:  'Vencida',
  anulada:  'Anulada',
};

const optStr = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().max(max).optional(),
  );

const moneyStr = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toFixed(2) : String(v).replace(',', '.')))
  .pipe(z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Importe inválido'));

const qty = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toFixed(2) : String(v).replace(',', '.')))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Cantidad inválida'));

// ── Líneas ────────────────────────────────────────────────────────────

export const invoiceLineSchema = z.object({
  id:          z.coerce.number().int().positive().optional(),
  concept:     z.string().min(1).max(500),
  description: z.string().optional(),
  quantity:    qty.default('1'),
  unitPrice:   moneyStr,
  discount:    qty.default('0'),
  subtotal:    moneyStr,
});
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

// ── Factura emitida ───────────────────────────────────────────────────

export const createIssuedInvoiceSchema = z.object({
  issuerCompanyId:   z.coerce.number().int().positive(),
  billingClientId:   z.coerce.number().int().positive(),
  relatedBrandId:    z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  relatedTalentId:   z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  relatedDealId:     z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  issueDate:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  dueDate:           z.preprocess((v) => (v === '' ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  currency:          z.string().length(3).default('EUR'),
  vatRate:           moneyStr.default('0'),
  withholdingRate:   moneyStr.default('0'),
  paymentTerms:      z.string().optional(),
  legalNote:         z.string().optional(),
  notes:             z.string().optional(),
  status:            z.enum(ISSUED_INVOICE_STATUSES).default('borrador'),
  linesJson:         z.string().min(2), // JSON stringified lines
});

export const updateIssuedInvoiceSchema = createIssuedInvoiceSchema.partial().extend({
  id: z.coerce.number().int().positive(),
});

// ── Empresa emisora ───────────────────────────────────────────────────

export const issuerCompanySchema = z.object({
  name:                  z.string().min(1).max(200),
  legalName:             optStr(250),
  taxId:                 optStr(30),
  country:               optStr(50),
  address:               z.string().optional(),
  city:                  optStr(100),
  postalCode:            optStr(20),
  email:                 z.preprocess((v) => (v === '' ? undefined : v), z.email().optional()),
  defaultCurrency:       z.string().length(3).default('EUR'),
  defaultPaymentTerms:   z.string().optional(),
  bankDetails:           z.string().optional(),
  cryptoDetails:         z.string().optional(),
  invoiceSeriesPrefix:   z.string().min(1).max(10).default('SP'),
  notes:                 z.string().optional(),
});

// ── Cliente de facturación ────────────────────────────────────────────

export const billingClientSchema = z.object({
  name:                    z.string().min(1).max(200),
  legalName:               optStr(250),
  taxId:                   optStr(30),
  vatNumber:               optStr(30),
  country:                 optStr(50),
  address:                 z.string().optional(),
  city:                    optStr(100),
  postalCode:              optStr(20),
  email:                   z.preprocess((v) => (v === '' ? undefined : v), z.email().optional()),
  type:                    z.enum(BILLING_CLIENT_TYPES).default('empresa_espana'),
  defaultVatRate:          moneyStr.default('0'),
  defaultWithholdingRate:  moneyStr.default('0'),
  relatedBrandId:          z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().positive().optional()),
  notes:                   z.string().optional(),
});
