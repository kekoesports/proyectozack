import 'server-only';

import { and, eq, isNull, notInArray } from 'drizzle-orm';
import { z } from 'zod';

import { automationDealDrafts } from '@/db/schema/automationDealDrafts';
import { campaigns } from '@/db/schema/campaigns';
import { crmBrands } from '@/db/schema/crmBrands';
import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import { talents } from '@/db/schema/talents';
import { db } from '@/lib/db';
import { getAutomationDealMissingFields } from '@/lib/automationDealValidation';
import { createAutomatedDeal } from '@/lib/queries/automationDeals';
import { ensureDealTrackingSheet } from '@/lib/queries/ensureDealTrackingSheet';
import { AutomationDealCreate } from '@/lib/schemas/automationDeal';

const PIPELINE_CHANNEL = '1533123521574862991';
const NamedReference = z.object({ id: z.number().int().positive().optional(), name: z.string().optional() });
const Identity = z.object({ brand: NamedReference, talent: NamedReference,
  name: z.string().optional(), currency: z.enum(['EUR', 'USD']).optional(),
  amountBrand: z.number().nonnegative().optional(), amountTalent: z.number().nonnegative().optional(),
}).passthrough();
const fold = (value: string): string => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export type PipelineCompletion = {
  readonly status: string;
  readonly campaignId?: number;
  readonly warnings: readonly string[];
  readonly missingFields?: readonly string[];
};

/** Complete unambiguous internal messages. Never amend money or generate contracts. */
export async function completePipelineDeal(draftId: number, parserWarnings: readonly string[] = []): Promise<PipelineCompletion> {
  const [draft] = await db.select().from(automationDealDrafts)
    .where(eq(automationDealDrafts.id, draftId)).limit(1);
  if (!draft) throw new Error('pipeline-draft-not-found');
  if (draft.source !== 'discord' || draft.sourceChannelId !== PIPELINE_CHANNEL
    || !['missing_info', 'pending_review'].includes(draft.status)) {
    return { status: draft.status, warnings: [] };
  }
  const identity = Identity.safeParse(draft.proposedDeal);
  if (!identity.success) return { status: draft.status, warnings: ['Revisa identidad, moneda e importes.'] };
  const input = identity.data;
  const roster = await db.select({ id: talents.id, name: talents.name, slug: talents.slug })
    .from(talents).where(isNull(talents.archivedAt));
  const talentMatches = roster.filter((row) => input.talent.id
    ? row.id === input.talent.id
    : Boolean(input.talent.name) && [fold(row.name), fold(row.slug)].includes(fold(input.talent.name ?? '')));
  if (talentMatches.length !== 1 || !talentMatches[0]) {
    return { status: draft.status, warnings: ['El creador necesita identificación inequívoca en el CRM.'] };
  }
  const talent = talentMatches[0];
  const brands = await db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands);
  const brandMatches = brands.filter((row) => input.brand.id
    ? row.id === input.brand.id : Boolean(input.brand.name) && fold(row.name) === fold(input.brand.name ?? ''));
  if (brandMatches.length !== 1 || !brandMatches[0]) {
    return { status: draft.status, warnings: ['La marca necesita identificación inequívoca en el CRM.'] };
  }
  const brand = brandMatches[0];
  const edition = input.name?.match(/ #([1-9]\d{0,2})$/)?.[1];
  const canonical = { ...input,
    name: `${talent.name} x ${brand.name}${edition ? ` #${edition}` : ''}`,
    brand: { id: brand.id }, talent: { id: talent.id },
  };
  const missingFields = [...new Set([...getAutomationDealMissingFields(canonical),
    ...(['currency', 'amountBrand', 'amountTalent'] as const).filter((key) => input[key] === undefined)])];
  if (parserWarnings.length || missingFields.length) {
    const status = missingFields.length ? 'missing_info' : 'pending_review';
    await db.update(automationDealDrafts).set({ proposedDeal: canonical, status,
      error: [...parserWarnings, ...missingFields].join('; ').slice(0, 2000), updatedAt: new Date(),
    }).where(and(eq(automationDealDrafts.id, draft.id), isNull(automationDealDrafts.campaignId)));
    return { status, warnings: [], missingFields };
  }
  const proposed = AutomationDealCreate.safeParse(canonical);
  if (!proposed.success) return { status: draft.status, warnings: ['Revisa los datos o entregables del trato.'] };

  const linked = await db.transaction(async (tx) => {
    // Serialize matching for the same real creator without blocking FK key-share locks.
    await tx.select({ id: talents.id }).from(talents).where(eq(talents.id, talent.id)).for('no key update');
    const [currentDraft] = await tx.select().from(automationDealDrafts)
      .where(eq(automationDealDrafts.id, draft.id)).for('update');
    if (!currentDraft || !['missing_info', 'pending_review'].includes(currentDraft.status)) {
      return { campaignId: currentDraft?.campaignId ?? null, conflict: false };
    }
    const candidates = await tx.select().from(campaigns).where(and(
      eq(campaigns.talentId, talent.id), eq(campaigns.brandId, brand.id),
      isNull(campaigns.archivedAt),
    ));
    // An explicit numbered agreement is a distinct deal, including on replay.
    // Unnumbered messages keep the conservative existing-active-deal check.
    const matches = candidates.filter((row) => edition
      ? fold(row.name) === fold(proposed.data.name)
      : !['cancelada', 'completada', 'pagada'].includes(row.status));
    if (matches.length > 1) return { campaignId: null, conflict: true };
    const existing = matches[0];
    if (existing && (existing.currency !== proposed.data.currency
      || Number(existing.amountBrand) !== proposed.data.amountBrand
      || Number(existing.amountTalent) !== proposed.data.amountTalent
      || (proposed.data.startDate && proposed.data.startDate !== existing.startDate)
      || (proposed.data.endDate && proposed.data.endDate !== existing.endDate))) {
      return { campaignId: null, conflict: true };
    }
    let campaignId = existing?.id;
    if (existing) {
      const trackers = await tx.select().from(dealDeliverableTrackers).where(and(
        eq(dealDeliverableTrackers.campaignId, existing.id),
        notInArray(dealDeliverableTrackers.status, ['cancelled']),
      ));
      if (trackers.length && (trackers.length !== proposed.data.deliverables.length
        || trackers.some((row) => !proposed.data.deliverables.some((item) =>
          item.type === row.deliverableType && item.targetCount === row.targetCount)))) {
        return { campaignId: null, conflict: true };
      }
      if (trackers.length === 0) {
        if (existing.trackingSheetUrl) return { campaignId: null, conflict: true };
        await tx.insert(dealDeliverableTrackers).values(proposed.data.deliverables.map((row) => ({
          campaignId: existing.id, talentId: talent.id, brandName: brand.name, dealName: existing.name,
          deliverableType: row.type, targetCount: row.targetCount, notes: row.notes ?? null,
        })));
      }
    } else {
      const created = await createAutomatedDeal(proposed.data, `draft:${draft.id}`);
      campaignId = created.campaignId;
      if (created.created && !proposed.data.startDate && !proposed.data.durationMonths) {
        // Chat intake must not turn the generic +2-day default into an agreed date.
        await tx.update(campaigns).set({ startDate: null }).where(eq(campaigns.id, campaignId));
      }
    }
    if (!campaignId) throw new Error('pipeline-campaign-missing');
    await tx.update(automationDealDrafts).set({ campaignId, status: 'pending_review', proposedDeal: proposed.data,
      reviewedBy: 'pipeline-validated', reviewedAt: new Date(), updatedAt: new Date(), error: null,
    }).where(eq(automationDealDrafts.id, draft.id));
    return { campaignId, conflict: false };
  });
  if (linked.conflict || !linked.campaignId) {
    await db.update(automationDealDrafts).set({ status: 'pending_review',
      error: 'pipeline-existing-deal-conflict', updatedAt: new Date(),
    }).where(and(eq(automationDealDrafts.id, draft.id), isNull(automationDealDrafts.campaignId)));
    return { status: 'pending_review', missingFields: [], warnings: ['Ya existe un trato con datos distintos; revisa el borrador para confirmar si es un acuerdo nuevo o una corrección.'] };
  }
  // Different Discord messages can resolve to the same deal. Serialize sheet
  // creation too, after trackers have committed and are visible to the helper.
  const campaignId = linked.campaignId;
  const sheet = await db.transaction(async (tx) => {
    await tx.select({ id: talents.id }).from(talents).where(eq(talents.id, talent.id)).for('no key update');
    return ensureDealTrackingSheet(campaignId);
  });
  const sheetPending = sheet.status === 'failed' || sheet.status === 'skipped';
  const sharingPending = sheet.status === 'created' && sheet.shareStatus !== 'shared';
  await db.update(automationDealDrafts).set({
    status: 'created',
    sheetShareStatus: sheet.status === 'created' ? sheet.shareStatus
      : sheet.status === 'already_had_sheet' ? 'not-requested' : null,
    error: sheetPending ? 'pipeline-sheet-pending' : sharingPending ? 'pipeline-sharing-pending' : null,
    updatedAt: new Date(),
  }).where(eq(automationDealDrafts.id, draft.id));
  return { status: 'created', campaignId: linked.campaignId,
    missingFields: [], warnings: sheetPending ? ['Trato guardado en el CRM; no se ha podido crear la hoja de seguimiento.']
      : sharingPending ? [sheet.status === 'created' && sheet.shareStatus === 'not-requested'
        ? 'Trato y hoja creados. Falta el email de contacto del creador para compartirle la hoja.'
        : 'Trato y hoja creados. Ha fallado el acceso del creador a la hoja; revisa los permisos.'] : [],
  };
}
