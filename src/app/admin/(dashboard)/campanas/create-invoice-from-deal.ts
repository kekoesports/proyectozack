'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { getCampaignWithRelations } from '@/lib/queries/campaigns';
import {
  getIssuerCompanies,
  getBillingClientByBrand,
  createBillingClient,
  allocateInvoiceNumber,
  createIssuedInvoice,
  listIssuedInvoicesByDeal,
} from '@/lib/queries/issuedInvoices';

type Result = {
  readonly error?: string;
  readonly success?: boolean;
  readonly invoiceId?: number;
  readonly invoiceNumber?: string;
  readonly warning?: string;
};

export async function createInvoiceFromDealAction(
  campaignId: number,
  issuerId: number,
  forceCreate = false,
): Promise<Result> {
  const session = await requirePermission('campanas', 'delete');

  const campaign = await getCampaignWithRelations(campaignId);
  if (!campaign) return { error: 'Trato no encontrado' };

  // Verificar facturas existentes para este trato
  const existing = await listIssuedInvoicesByDeal(campaignId);
  const active   = existing.filter((i) => i.status !== 'anulada');

  if (active.length > 0 && !forceCreate) {
    return {
      error: 'duplicate',
      warning: `Ya existe ${active.length === 1 ? 'una factura' : `${active.length} facturas`} para este trato (${active.map((i) => i.invoiceNumber).join(', ')}). Confirma para crear otra.`,
    };
  }

  // Obtener empresa emisora
  const issuers = await getIssuerCompanies();
  const issuer  = issuers.find((i) => i.id === issuerId) ?? issuers[0];
  if (!issuer) return { error: 'No hay empresas emisoras configuradas' };

  // Obtener o crear cliente de facturación para esta marca
  let client = await getBillingClientByBrand(campaign.brandId);
  if (!client) {
    client = await createBillingClient({
      name:              campaign.brand.name ?? `Marca ${campaign.brandId}`,
      legalName:         null,
      taxId:             null,
      vatNumber:         null,
      country:           null,
      address:           null,
      city:              null,
      postalCode:        null,
      email:             null,
      type:              'empresa_espana',
      defaultVatRate:    '0',
      defaultWithholdingRate: '0',
      // Auto-create desde trato: type='empresa_espana' apunta a cliente
      // español → default 'es' aquí. Editable después desde la ficha.
      pdfLanguage:       'es',
      relatedBrandId:    campaign.brandId,
      notes:             'Creado automáticamente desde trato',
    });
  }

  const amountBrand = Number(campaign.amountBrand ?? 0);
  const today       = new Date().toISOString().slice(0, 10);
  const dueDate     = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const currency    = issuer.defaultCurrency ?? 'EUR';

  const invoiceNumber = await allocateInvoiceNumber(issuer.id);

  const legalNote = currency !== 'EUR'
    ? 'Invoice issued for international marketing services. VAT not applied according to applicable tax rules.'
    : 'Factura emitida por servicios de marketing digital.';

  const row = await createIssuedInvoice({
    invoice: {
      issuerCompanyId: issuer.id,
      billingClientId: client.id,
      relatedBrandId:  campaign.brandId,
      relatedTalentId: campaign.talentId ?? null,
      relatedDealId:   campaignId,
      invoiceNumber,
      series:          invoiceNumber.split('-')[0] ?? null,
      status:          'borrador',
      issueDate:       today,
      dueDate,
      currency,
      netAmount:       String(amountBrand.toFixed(2)),
      vatRate:         '0',
      vatAmount:       '0',
      withholdingRate: '0',
      withholdingAmount: '0',
      totalAmount:     String(amountBrand.toFixed(2)),
      paymentTerms:    issuer.defaultPaymentTerms ?? 'Pago a 30 días desde la fecha de emisión',
      legalNote,
      notes:           `Generada automáticamente desde trato: ${campaign.name}`,
      pdfUrl:              null,
      rectifiedInvoiceId:  null,
      rectificationType:   null,
      rectificationReason: null,
      createdByUserId: session.user.id,
    },
    lines: amountBrand > 0 ? [{
      concept:     `Campaña de marketing digital — ${campaign.name}`,
      description: campaign.notes ?? null,
      quantity:    '1',
      unitPrice:   String(amountBrand.toFixed(2)),
      discount:    '0',
      subtotal:    String(amountBrand.toFixed(2)),
    }] : [],
  });

  revalidatePath(`/admin/campanas/${campaignId}`);
  revalidatePath('/admin/facturacion');
  return { success: true, invoiceId: row.id, invoiceNumber };
}
