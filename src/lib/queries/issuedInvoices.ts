import { and, asc, desc, eq, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/lib/db';
import {
  issuerCompanies, billingClients, issuedInvoices, issuedInvoiceLines,
  crmBrands, talents, campaigns,
} from '@/db/schema';
import type {
  IssuerCompany, BillingClient, IssuedInvoice, IssuedInvoiceWithRelations,
  IssuedInvoiceLine,
} from '@/types';

const originalInvoice = alias(issuedInvoices, 'original_invoice');

// ── Empresas emisoras ─────────────────────────────────────────────────

const DEFAULT_ISSUERS = [
  {
    name: 'SocialPro España',
    legalName: 'ElevateX Agency PA SL',
    taxId: 'B21821046',
    country: 'España',
    city: 'Córdoba',
    postalCode: '14011',
    defaultCurrency: 'EUR',
    invoiceSeriesPrefix: 'ES',
    nextInvoiceNumber: 1,
    bankDetails: 'IBAN: ES00 0000 0000 0000 0000 0000\nBIC/SWIFT: XXXXX\nBanco: ',
    isActive: true,
  },
  {
    name: 'SocialPro Andorra',
    legalName: 'SocialPro Andorra SL',
    country: 'Andorra',
    defaultCurrency: 'EUR',
    invoiceSeriesPrefix: 'AD',
    nextInvoiceNumber: 1,
    isActive: true,
  },
  {
    name: 'SocialPro LLC',
    legalName: 'SocialPro LLC',
    country: 'USA',
    defaultCurrency: 'USD',
    invoiceSeriesPrefix: 'US',
    nextInvoiceNumber: 1,
    isActive: true,
  },
] as const;

export async function getIssuerCompanies(): Promise<readonly IssuerCompany[]> {
  const rows = await db.select().from(issuerCompanies)
    .where(eq(issuerCompanies.isActive, true))
    .orderBy(asc(issuerCompanies.id));

  if (rows.length === 0) {
    // Seed inicial con las 3 empresas por defecto
    const seeded = await db.insert(issuerCompanies)
      .values(DEFAULT_ISSUERS.map((d) => ({ ...d })))
      .returning();
    return seeded;
  }
  return rows;
}

export async function getIssuerCompany(id: number): Promise<IssuerCompany | null> {
  const [row] = await db.select().from(issuerCompanies).where(eq(issuerCompanies.id, id)).limit(1);
  return row ?? null;
}

export async function updateIssuerCompany(id: number, patch: Partial<IssuerCompany>): Promise<IssuerCompany | null> {
  const [row] = await db.update(issuerCompanies)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(issuerCompanies.id, id))
    .returning();
  return row ?? null;
}

// ── Clientes de facturación ───────────────────────────────────────────

export async function getBillingClients(): Promise<readonly BillingClient[]> {
  return db.select().from(billingClients).orderBy(asc(billingClients.name));
}

export async function getBillingClientByBrand(brandId: number): Promise<BillingClient | null> {
  const [row] = await db.select().from(billingClients)
    .where(eq(billingClients.relatedBrandId, brandId)).limit(1);
  return row ?? null;
}

export async function getBillingClient(id: number): Promise<BillingClient | null> {
  const [row] = await db.select().from(billingClients).where(eq(billingClients.id, id)).limit(1);
  return row ?? null;
}

export async function createBillingClient(values: Omit<BillingClient, 'id' | 'createdAt' | 'updatedAt'>): Promise<BillingClient> {
  const [row] = await db.insert(billingClients).values(values).returning();
  if (!row) throw new Error('Failed to insert billing client');
  return row;
}

export async function updateBillingClient(id: number, patch: Partial<BillingClient>): Promise<BillingClient | null> {
  const [row] = await db.update(billingClients)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(billingClients.id, id))
    .returning();
  return row ?? null;
}

// ── Facturas emitidas ─────────────────────────────────────────────────

export async function listIssuedInvoicesByDeal(dealId: number): Promise<readonly IssuedInvoiceWithRelations[]> {
  return listIssuedInvoices({ dealId });
}

export async function listIssuedInvoices(filters: {
  status?: string;
  issuerId?: number;
  clientId?: number;
  dealId?: number;
  /** Si se pasa, solo devuelve facturas creadas por este usuario o de campañas asignadas a él */
  staffUserId?: string;
} = {}): Promise<readonly IssuedInvoiceWithRelations[]> {
  const conds = [];
  if (filters.status)   conds.push(eq(issuedInvoices.status, filters.status));
  if (filters.issuerId) conds.push(eq(issuedInvoices.issuerCompanyId, filters.issuerId));
  if (filters.clientId) conds.push(eq(issuedInvoices.billingClientId, filters.clientId));
  if (filters.dealId)   conds.push(eq(issuedInvoices.relatedDealId, filters.dealId));
  if (filters.staffUserId) {
    const visibility = or(
      eq(issuedInvoices.createdByUserId, filters.staffUserId),
      sql`${issuedInvoices.relatedDealId} IN (
        SELECT id FROM campaigns
        WHERE assigned_to_user_id = ${filters.staffUserId}
           OR created_by_user_id  = ${filters.staffUserId}
      )`,
    );
    if (visibility) conds.push(visibility);
  }

  const rows = await db.select({
    // issuedInvoices fields
    id:                    issuedInvoices.id,
    issuerCompanyId:       issuedInvoices.issuerCompanyId,
    billingClientId:       issuedInvoices.billingClientId,
    relatedBrandId:        issuedInvoices.relatedBrandId,
    relatedTalentId:       issuedInvoices.relatedTalentId,
    relatedDealId:         issuedInvoices.relatedDealId,
    invoiceNumber:         issuedInvoices.invoiceNumber,
    series:                issuedInvoices.series,
    status:                issuedInvoices.status,
    issueDate:             issuedInvoices.issueDate,
    dueDate:               issuedInvoices.dueDate,
    currency:              issuedInvoices.currency,
    netAmount:             issuedInvoices.netAmount,
    vatRate:               issuedInvoices.vatRate,
    vatAmount:             issuedInvoices.vatAmount,
    withholdingRate:       issuedInvoices.withholdingRate,
    withholdingAmount:     issuedInvoices.withholdingAmount,
    totalAmount:           issuedInvoices.totalAmount,
    paymentTerms:          issuedInvoices.paymentTerms,
    legalNote:             issuedInvoices.legalNote,
    notes:                 issuedInvoices.notes,
    pdfUrl:                issuedInvoices.pdfUrl,
    rectifiedInvoiceId:    issuedInvoices.rectifiedInvoiceId,
    rectificationType:     issuedInvoices.rectificationType,
    rectificationReason:   issuedInvoices.rectificationReason,
    createdByUserId:       issuedInvoices.createdByUserId,
    createdAt:             issuedInvoices.createdAt,
    updatedAt:             issuedInvoices.updatedAt,
    // Relations
    issuerName:             issuerCompanies.name,
    clientName:             billingClients.name,
    brandName:              crmBrands.name,
    talentName:             talents.name,
    dealName:               campaigns.name,
    rectifiedInvoiceNumber: originalInvoice.invoiceNumber,
  })
  .from(issuedInvoices)
  .innerJoin(issuerCompanies, eq(issuerCompanies.id, issuedInvoices.issuerCompanyId))
  .innerJoin(billingClients,  eq(billingClients.id,  issuedInvoices.billingClientId))
  .leftJoin(crmBrands,       eq(crmBrands.id,        issuedInvoices.relatedBrandId))
  .leftJoin(talents,         eq(talents.id,           issuedInvoices.relatedTalentId))
  .leftJoin(campaigns,       eq(campaigns.id,         issuedInvoices.relatedDealId))
  .leftJoin(originalInvoice, eq(originalInvoice.id,  issuedInvoices.rectifiedInvoiceId))
  .where(conds.length > 0 ? and(...conds) : undefined)
  .orderBy(desc(issuedInvoices.issueDate), desc(issuedInvoices.id));

  // Load lines for each invoice
  if (rows.length === 0) return rows.map((r) => ({ ...r, lines: [] }));
  const ids = rows.map((r) => r.id);
  const allLines = await db.select().from(issuedInvoiceLines)
    .where(sql`${issuedInvoiceLines.invoiceId} = ANY(${sql`ARRAY[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::int[]`})`)
    .orderBy(asc(issuedInvoiceLines.id));

  const linesByInvoice = new Map<number, IssuedInvoiceLine[]>();
  for (const l of allLines) {
    const arr = linesByInvoice.get(l.invoiceId) ?? [];
    arr.push(l);
    linesByInvoice.set(l.invoiceId, arr);
  }

  return rows.map((r) => ({ ...r, lines: linesByInvoice.get(r.id) ?? [] }));
}

/** Genera el próximo número de factura para una empresa y lo incrementa atómicamente */
export async function allocateInvoiceNumber(issuerId: number): Promise<string> {
  const [row] = await db
    .update(issuerCompanies)
    .set({
      nextInvoiceNumber: sql`next_invoice_number + 1`,
      updatedAt: new Date(),
    })
    .where(eq(issuerCompanies.id, issuerId))
    .returning({
      prefix: issuerCompanies.invoiceSeriesPrefix,
      num:    sql<number>`next_invoice_number - 1`,
    });
  if (!row) throw new Error('Empresa emisora no encontrada');
  const year = new Date().getFullYear();
  return `${row.prefix}-${year}-${String(row.num).padStart(4, '0')}`;
}

/** Genera el próximo número de factura rectificativa y lo incrementa atómicamente */
export async function allocateRectificationNumber(issuerId: number): Promise<string> {
  const [row] = await db
    .update(issuerCompanies)
    .set({
      nextRectificationNumber: sql`next_rectification_number + 1`,
      updatedAt: new Date(),
    })
    .where(eq(issuerCompanies.id, issuerId))
    .returning({
      prefix: issuerCompanies.invoiceSeriesPrefix,
      num:    sql<number>`next_rectification_number - 1`,
    });
  if (!row) throw new Error('Empresa emisora no encontrada');
  const year = new Date().getFullYear();
  return `R-${row.prefix}-${year}-${String(row.num).padStart(4, '0')}`;
}

export async function createIssuedInvoice(values: {
  invoice: Omit<IssuedInvoice, 'id' | 'createdAt' | 'updatedAt'>;
  lines:   Omit<IssuedInvoiceLine, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>[];
}): Promise<IssuedInvoice> {
  const [row] = await db.insert(issuedInvoices).values(values.invoice).returning();
  if (!row) throw new Error('Failed to insert issued invoice');
  if (values.lines.length > 0) {
    await db.insert(issuedInvoiceLines).values(
      values.lines.map((l) => ({ ...l, invoiceId: row.id })),
    );
  }
  return row;
}

export async function updateIssuedInvoice(
  id: number,
  invoice: Partial<IssuedInvoice>,
  lines?: Omit<IssuedInvoiceLine, 'id' | 'invoiceId' | 'createdAt' | 'updatedAt'>[],
): Promise<IssuedInvoice | null> {
  const [row] = await db.update(issuedInvoices)
    .set({ ...invoice, updatedAt: new Date() })
    .where(eq(issuedInvoices.id, id))
    .returning();
  if (!row) return null;
  if (lines !== undefined) {
    await db.delete(issuedInvoiceLines).where(eq(issuedInvoiceLines.invoiceId, id));
    if (lines.length > 0) {
      await db.insert(issuedInvoiceLines).values(lines.map((l) => ({ ...l, invoiceId: id })));
    }
  }
  return row;
}

export async function getIssuedInvoice(id: number): Promise<IssuedInvoice | null> {
  const [row] = await db.select().from(issuedInvoices).where(eq(issuedInvoices.id, id)).limit(1);
  return row ?? null;
}
