import 'server-only';

import { getAutomationDealDigest } from '@/lib/queries/automationDealDigest';
import { getCampaignWithRelations } from '@/lib/queries/campaigns';
import {
  allocateInvoiceNumber,
  createBillingClient,
  createIssuedInvoice,
  getBillingClientByBrand,
  getIssuedInvoiceByAutomationKey,
  getIssuerCompanies,
  listIssuedInvoicesByDeal,
} from '@/lib/queries/issuedInvoices';

const AUTOMATION_KEY_PREFIX = 'deal-progress-80';

export type DealInvoiceDraftOutcome = {
  readonly campaignId: number;
  readonly campaignName: string;
  readonly talentName: string;
  readonly brandName: string;
  readonly status: 'created' | 'existing' | 'skipped' | 'failed';
  readonly invoiceId?: number;
  readonly invoiceNumber?: string;
  readonly reviewRequired?: boolean;
  readonly reason?: 'invalid-amount' | 'missing-issuer' | 'internal-error';
};

export type DealInvoiceDraftBatch = {
  readonly candidates: number;
  readonly created: number;
  readonly existing: number;
  readonly skipped: number;
  readonly failed: number;
  readonly outcomes: readonly DealInvoiceDraftOutcome[];
};

export async function ensureDealInvoiceDraft(
  campaignId: number,
  createdByUserId: string | null = null,
): Promise<DealInvoiceDraftOutcome> {
  const campaign = await getCampaignWithRelations(campaignId);
  if (!campaign) {
    return unknownDealOutcome(campaignId, 'failed', 'internal-error');
  }

  const identity = {
    campaignId,
    campaignName: campaign.name,
    talentName: campaign.talent?.name ?? `Talento ${campaign.talentId}`,
    brandName: campaign.brand?.name ?? `Marca ${campaign.brandId}`,
  } as const;
  const automationKey = `${AUTOMATION_KEY_PREFIX}:${campaignId}`;

  const automated = await getIssuedInvoiceByAutomationKey(automationKey);
  if (automated) {
    return {
      ...identity,
      status: 'existing',
      invoiceId: automated.id,
      invoiceNumber: automated.invoiceNumber,
      reviewRequired: automated.status === 'borrador',
    };
  }

  // Una factura manual activa también satisface el trato. La automatización
  // nunca crea una segunda factura en paralelo.
  const existing = await listIssuedInvoicesByDeal(campaignId);
  const active = existing.find((invoice) => invoice.status !== 'anulada');
  if (active) {
    return {
      ...identity,
      status: 'existing',
      invoiceId: active.id,
      invoiceNumber: active.invoiceNumber,
      reviewRequired: active.status === 'borrador',
    };
  }

  const amountBrand = Number(campaign.amountBrand ?? 0);
  if (!Number.isFinite(amountBrand) || amountBrand <= 0) {
    return { ...identity, status: 'skipped', reason: 'invalid-amount' };
  }

  const issuer = (await getIssuerCompanies())[0];
  if (!issuer) {
    return { ...identity, status: 'skipped', reason: 'missing-issuer' };
  }

  let client = await getBillingClientByBrand(campaign.brandId);
  if (!client) {
    client = await createBillingClient({
      name: campaign.brand?.name ?? `Marca ${campaign.brandId}`,
      legalName: null,
      taxId: null,
      vatNumber: null,
      country: null,
      address: null,
      city: null,
      postalCode: null,
      email: null,
      type: 'empresa_espana',
      defaultVatRate: '0',
      defaultWithholdingRate: '0',
      pdfLanguage: 'es',
      relatedBrandId: campaign.brandId,
      notes: 'Creado automáticamente desde trato al alcanzar el 80 %',
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const currency = campaign.currency || issuer.defaultCurrency || 'EUR';
  const invoiceNumber = await allocateInvoiceNumber(issuer.id);
  const amount = amountBrand.toFixed(2);

  try {
    const row = await createIssuedInvoice({
      invoice: {
        issuerCompanyId: issuer.id,
        billingClientId: client.id,
        relatedBrandId: campaign.brandId,
        relatedTalentId: campaign.talentId,
        relatedDealId: campaignId,
        automationKey,
        invoiceNumber,
        series: invoiceNumber.split('-')[0] ?? null,
        status: 'borrador',
        issueDate: today,
        dueDate,
        currency,
        netAmount: amount,
        // El importe acordado se conserva como total del borrador. IVA y
        // retención se fijan en la revisión fiscal, nunca por inferencia.
        vatRate: '0',
        vatAmount: '0',
        withholdingRate: '0',
        withholdingAmount: '0',
        totalAmount: amount,
        fxRate: null,
        fxRateDate: null,
        eurEquivalent: currency === 'EUR' ? amount : null,
        paymentTerms: issuer.defaultPaymentTerms ?? 'Pago a 30 días desde la fecha de emisión',
        legalNote: currency === 'EUR'
          ? 'Borrador de factura por servicios de marketing digital. Revisar fiscalidad antes de emitir.'
          : 'Draft invoice for international marketing services. Review tax treatment before issuing.',
        notes: `Borrador automático al 80 % del trato: ${campaign.name}`,
        pdfUrl: null,
        rectifiedInvoiceId: null,
        rectificationType: null,
        rectificationReason: null,
        createdByUserId,
      },
      lines: [{
        concept: `Campaña de marketing digital — ${campaign.name}`,
        description: campaign.notes ?? null,
        quantity: '1',
        unitPrice: amount,
        discount: '0',
        subtotal: amount,
      }],
    });

    return {
      ...identity,
      status: 'created',
      invoiceId: row.id,
      invoiceNumber,
      reviewRequired: needsFiscalReview(client),
    };
  } catch {
    // La clave única convierte dos ejecuciones concurrentes en un resultado
    // idempotente. No se filtra el error SQL al canal de Discord.
    const raced = await getIssuedInvoiceByAutomationKey(automationKey);
    if (raced) {
      return {
        ...identity,
        status: 'existing',
        invoiceId: raced.id,
        invoiceNumber: raced.invoiceNumber,
        reviewRequired: raced.status === 'borrador',
      };
    }
    return { ...identity, status: 'failed', reason: 'internal-error' };
  }
}

export async function createEligibleDealInvoiceDrafts(): Promise<DealInvoiceDraftBatch> {
  const digest = await getAutomationDealDigest();
  const candidates = digest.deals.filter((deal) => (
    deal.progressPct >= 80
    && deal.targetCount > 0
    && deal.trackingSheetUrl !== null
    && deal.syncError === null
  ));

  const outcomes: DealInvoiceDraftOutcome[] = [];
  for (const candidate of candidates) {
    try {
      outcomes.push(await ensureDealInvoiceDraft(candidate.campaignId));
    } catch {
      outcomes.push({
        campaignId: candidate.campaignId,
        campaignName: candidate.name,
        talentName: candidate.talentName,
        brandName: candidate.brandName,
        status: 'failed',
        reason: 'internal-error',
      });
    }
  }

  return {
    candidates: candidates.length,
    created: count(outcomes, 'created'),
    existing: count(outcomes, 'existing'),
    skipped: count(outcomes, 'skipped'),
    failed: count(outcomes, 'failed'),
    outcomes,
  };
}

export function formatInvoiceDraftBatchForDiscord(
  batch: DealInvoiceDraftBatch,
  announceExisting = false,
): readonly string[] {
  const messages = batch.outcomes
    .filter((outcome) => outcome.status === 'created')
    .map((outcome) => [
      '## 🧾 BORRADOR DE FACTURA CREADO',
      `**${safe(outcome.talentName)} × ${safe(outcome.brandName)}**`,
      `Factura **${safe(outcome.invoiceNumber ?? 'sin número')}** · pendiente de revisión fiscal`,
      `🔗 https://socialpro.es/admin/campanas/${outcome.campaignId}`,
      'No se ha emitido ni enviado a la marca.',
    ].join('\n'));

  const problems = batch.outcomes.filter((outcome) => (
    outcome.status === 'skipped' || outcome.status === 'failed'
  ));
  if (problems.length > 0) {
    messages.push([
      '## ⚠️ FACTURACIÓN AUTOMÁTICA · REVISIÓN NECESARIA',
      ...problems.map((outcome) => (
        `• **${safe(outcome.talentName)} × ${safe(outcome.brandName)}** — ${reasonLabel(outcome.reason)}`
      )),
    ].join('\n'));
  }

  if (announceExisting && messages.length === 0) {
    messages.push(
      batch.candidates === 0
        ? '✅ No hay tratos activos al 80 % pendientes de preparar para facturación.'
        : `✅ Los ${batch.existing} tratos al 80 % ya tienen borrador o factura. No se ha creado ningún duplicado.`,
    );
  }
  return messages;
}

function needsFiscalReview(client: {
  readonly legalName: string | null;
  readonly taxId: string | null;
  readonly vatNumber: string | null;
  readonly country: string | null;
  readonly address: string | null;
}): boolean {
  return !client.legalName
    || (!client.taxId && !client.vatNumber)
    || !client.country
    || !client.address;
}

function count(
  outcomes: readonly DealInvoiceDraftOutcome[],
  status: DealInvoiceDraftOutcome['status'],
): number {
  return outcomes.filter((outcome) => outcome.status === status).length;
}

function unknownDealOutcome(
  campaignId: number,
  status: 'failed',
  reason: 'internal-error',
): DealInvoiceDraftOutcome {
  return {
    campaignId,
    campaignName: `Trato ${campaignId}`,
    talentName: 'Talento desconocido',
    brandName: 'Marca desconocida',
    status,
    reason,
  };
}

function reasonLabel(reason: DealInvoiceDraftOutcome['reason']): string {
  if (reason === 'invalid-amount') return 'falta un importe de marca válido';
  if (reason === 'missing-issuer') return 'no hay empresa emisora configurada';
  return 'no se pudo crear el borrador; se reintentará';
}

function safe(value: string): string {
  return value.replace(/@/g, '@\u200b').replace(/[\r\n]+/g, ' ').slice(0, 140);
}
