import 'server-only';

import { and, eq, ilike, inArray, isNotNull, ne, or } from 'drizzle-orm';

import { campaigns } from '@/db/schema/campaigns';
import { crmBrands } from '@/db/schema/crmBrands';
import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import { talents, talentSocials } from '@/db/schema/talents';
import { db } from '@/lib/db';
import { normalizeTrackingSheetInput, syncCampaignSheet } from '@/lib/queries/campaign-sheet-sync';
import type { CampaignActionType } from '@/lib/schemas/campaign';
import type { AutomationDealCreateInput } from '@/lib/schemas/automationDeal';
import type { DeliverableType } from '@/lib/schemas/deliverable';
import { initialsOf, slugify } from '@/lib/utils/import-utils';
import { createLimit } from '@/lib/utils/concurrencyLimit';

type AutomationTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type TopGeo = { readonly country: string; readonly pct: number };

export class AutomationDealInputError extends Error {}

export type AutomationDealProgress = {
  readonly campaignId: number;
  readonly name: string;
  readonly status: string;
  readonly brandId: number;
  readonly talentId: number;
  readonly trackingSheetUrl: string | null;
  readonly syncError: string | null;
  readonly lastSyncedAt: string | null;
  readonly targetCount: number;
  readonly currentCount: number;
  readonly progressPct: number;
  readonly alertLevel: number;
  readonly deliverables: ReadonlyArray<{
    readonly type: string;
    readonly targetCount: number;
    readonly currentCount: number;
    readonly progressPct: number;
  }>;
};

export type CreateAutomatedDealResult = AutomationDealProgress & {
  readonly created: boolean;
  readonly brandCreated: boolean;
  readonly talentCreated: boolean;
};

type ResolvedBrand = { readonly id: number; readonly name: string; readonly created: boolean };
type ResolvedTalent = { readonly id: number; readonly created: boolean };

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

function inferActionType(deliverables: readonly { readonly type: DeliverableType }[]): CampaignActionType {
  if (deliverables.length !== 1) return 'pack_mensual';
  const first = deliverables[0];
  if (!first) return 'otro';
  const map: Partial<Record<DeliverableType, CampaignActionType>> = {
    stream_integration: 'stream',
    video_youtube: 'video_youtube',
    short_reel_tiktok: 'short_reel_tiktok',
    story_instagram: 'story_instagram',
    tweet_x: 'tweet',
    preroll: 'preroll',
    pack_mensual: 'pack_mensual',
  };
  return map[first.type] ?? 'otro';
}

async function resolveBrand(
  tx: AutomationTransaction,
  reference: AutomationDealCreateInput['brand'],
): Promise<ResolvedBrand> {
  if ('id' in reference) {
    const [row] = await tx
      .select({ id: crmBrands.id, name: crmBrands.name })
      .from(crmBrands)
      .where(eq(crmBrands.id, reference.id))
      .limit(1);
    if (!row) throw new AutomationDealInputError('brand-not-found');
    return { ...row, created: false };
  }

  const [existing] = await tx
    .select({ id: crmBrands.id, name: crmBrands.name })
    .from(crmBrands)
    .where(ilike(crmBrands.name, escapeLike(reference.name)))
    .limit(1);
  if (existing) return { ...existing, created: false };
  if (!reference.createIfMissing) throw new AutomationDealInputError('brand-not-found');

  const [created] = await tx
    .insert(crmBrands)
    .values({ name: reference.name, status: 'en_negociacion' })
    .returning({ id: crmBrands.id, name: crmBrands.name });
  if (!created) throw new Error('brand-insert-failed');
  return { ...created, created: true };
}

async function updateTalentGeos(
  tx: AutomationTransaction,
  talentId: number,
  geos: readonly TopGeo[] | undefined,
  socialId?: number,
): Promise<void> {
  if (!geos) return;
  await tx
    .update(talents)
    .set({ topGeos: [...geos], lastStatsUpdateAt: new Date() })
    .where(eq(talents.id, talentId));
  if (socialId !== undefined) {
    await tx
      .update(talentSocials)
      .set({ topGeos: [...geos] })
      .where(eq(talentSocials.id, socialId));
  }
}

async function resolveTalent(
  tx: AutomationTransaction,
  reference: AutomationDealCreateInput['talent'],
): Promise<ResolvedTalent> {
  if ('id' in reference) {
    const [row] = await tx
      .select({ id: talents.id })
      .from(talents)
      .where(eq(talents.id, reference.id))
      .limit(1);
    if (!row) throw new AutomationDealInputError('talent-not-found');
    await updateTalentGeos(tx, row.id, reference.topGeos);
    return { id: row.id, created: false };
  }

  const handle = normalizeHandle(reference.handle);
  const [bySocial] = await tx
    .select({ talentId: talentSocials.talentId, socialId: talentSocials.id })
    .from(talentSocials)
    .where(and(
      eq(talentSocials.platform, reference.platform),
      or(
        ilike(talentSocials.handle, escapeLike(handle)),
        ilike(talentSocials.handle, escapeLike(`@${handle}`)),
      ),
    ))
    .limit(1);
  if (bySocial) {
    await updateTalentGeos(tx, bySocial.talentId, reference.topGeos, bySocial.socialId);
    return { id: bySocial.talentId, created: false };
  }

  const slug = slugify(reference.name);
  if (!slug) throw new AutomationDealInputError('invalid-talent-name');
  const [bySlug] = await tx
    .select({ id: talents.id })
    .from(talents)
    .where(eq(talents.slug, slug))
    .limit(1);
  if (bySlug) {
    const [social] = await tx
      .insert(talentSocials)
      .values({
        talentId: bySlug.id,
        platform: reference.platform,
        handle,
        followersDisplay: '-',
        hexColor: platformColor(reference.platform),
        sortOrder: 0,
        topGeos: reference.topGeos ? [...reference.topGeos] : null,
      })
      .returning({ id: talentSocials.id });
    await updateTalentGeos(tx, bySlug.id, reference.topGeos, social?.id);
    return { id: bySlug.id, created: false };
  }
  if (!reference.createIfMissing) throw new AutomationDealInputError('talent-not-found');

  const primaryPlatform = reference.platform === 'youtube' ? 'youtube' : 'twitch';
  const [created] = await tx
    .insert(talents)
    .values({
      slug,
      name: reference.name,
      role: 'Creator',
      game: reference.game ?? 'General',
      platform: primaryPlatform,
      status: 'inactive',
      bio: '',
      gradientC1: '#f5632a',
      gradientC2: '#8b3aad',
      initials: initialsOf(reference.name),
      visibility: 'internal',
      isPublished: false,
      showInRoster: false,
      creatorCountry: reference.country ?? null,
      topGeos: reference.topGeos ? [...reference.topGeos] : null,
      lastStatsUpdateAt: reference.topGeos ? new Date() : null,
    })
    .returning({ id: talents.id });
  if (!created) throw new Error('talent-insert-failed');

  await tx.insert(talentSocials).values({
    talentId: created.id,
    platform: reference.platform,
    handle,
    followersDisplay: '-',
    hexColor: platformColor(reference.platform),
    sortOrder: 0,
    topGeos: reference.topGeos ? [...reference.topGeos] : null,
  });
  return { id: created.id, created: true };
}

function platformColor(platform: string): string {
  const colors: Record<string, string> = {
    twitch: '#9147ff', youtube: '#ff0000', instagram: '#e1306c',
    tiktok: '#010101', kick: '#53fc18', x: '#1da1f2',
  };
  return colors[platform] ?? '#888888';
}

export async function createAutomatedDeal(
  input: AutomationDealCreateInput,
  idempotencyKey: string,
): Promise<CreateAutomatedDealResult> {
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(and(
        eq(campaigns.automationSource, 'n8n'),
        eq(campaigns.automationExternalId, idempotencyKey),
      ))
      .limit(1);
    if (existing) {
      return { campaignId: existing.id, created: false, brandCreated: false, talentCreated: false };
    }

    const brand = await resolveBrand(tx, input.brand);
    const talent = await resolveTalent(tx, input.talent);
    const tracking = normalizeTrackingSheetInput(input.trackingSheetUrl ?? '');
    const [campaign] = await tx
      .insert(campaigns)
      .values({
        name: input.name,
        brandId: brand.id,
        talentId: talent.id,
        actionType: inferActionType(input.deliverables),
        status: input.status,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        deliveryDeadline: input.deliveryDeadline ?? null,
        notes: input.notes ?? null,
        creatorNotes: input.creatorNotes ?? null,
        currency: input.currency,
        amountBrand: String(input.amountBrand),
        amountTalent: String(input.amountTalent),
        trackingSheetUrl: tracking.trackingSheetUrl,
        trackingSheetSpreadsheetId: tracking.trackingSheetSpreadsheetId,
        trackingSheetGid: tracking.trackingSheetGid,
        automationSource: 'n8n',
        automationExternalId: idempotencyKey,
      })
      .onConflictDoNothing()
      .returning({ id: campaigns.id });

    if (!campaign) {
      const [raced] = await tx
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(and(
          eq(campaigns.automationSource, 'n8n'),
          eq(campaigns.automationExternalId, idempotencyKey),
        ))
        .limit(1);
      if (!raced) throw new Error('campaign-insert-failed');
      return { campaignId: raced.id, created: false, brandCreated: false, talentCreated: false };
    }

    await tx.insert(dealDeliverableTrackers).values(
      input.deliverables.map((row) => ({
        campaignId: campaign.id,
        talentId: talent.id,
        brandName: brand.name,
        dealName: input.name,
        deliverableType: row.type,
        targetCount: row.targetCount,
        currentCount: 0,
        status: 'active' as const,
        trackingSourceType: 'manual' as const,
        notes: row.notes ?? null,
      })),
    );
    return {
      campaignId: campaign.id,
      created: true,
      brandCreated: brand.created,
      talentCreated: talent.created,
    };
  });

  const progress = await getAutomatedDealProgress(result.campaignId);
  if (!progress) throw new Error('campaign-read-after-write-failed');
  return { ...progress, ...result };
}

export async function getAutomatedDealProgress(campaignId: number): Promise<AutomationDealProgress | null> {
  const [campaign] = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      brandId: campaigns.brandId,
      talentId: campaigns.talentId,
      trackingSheetUrl: campaigns.trackingSheetUrl,
      syncError: campaigns.trackingSyncError,
      lastSyncedAt: campaigns.lastTrackingSyncAt,
      alertLevel: campaigns.trackingAlertLevel,
    })
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.automationSource, 'n8n')))
    .limit(1);
  if (!campaign) return null;

  const rows = await db
    .select({
      type: dealDeliverableTrackers.deliverableType,
      targetCount: dealDeliverableTrackers.targetCount,
      currentCount: dealDeliverableTrackers.currentCount,
    })
    .from(dealDeliverableTrackers)
    .where(and(
      eq(dealDeliverableTrackers.campaignId, campaignId),
      ne(dealDeliverableTrackers.status, 'cancelled'),
    ));
  const targetCount = rows.reduce((sum, row) => sum + row.targetCount, 0);
  const currentCount = rows.reduce((sum, row) => sum + row.currentCount, 0);
  const progressPct = targetCount > 0 ? Math.min(100, Math.round((currentCount / targetCount) * 100)) : 0;
  return {
    campaignId: campaign.id,
    name: campaign.name,
    status: campaign.status,
    brandId: campaign.brandId,
    talentId: campaign.talentId,
    trackingSheetUrl: campaign.trackingSheetUrl,
    syncError: campaign.syncError,
    lastSyncedAt: campaign.lastSyncedAt?.toISOString() ?? null,
    targetCount,
    currentCount,
    progressPct,
    alertLevel: campaign.alertLevel,
    deliverables: rows.map((row) => ({
      type: row.type,
      targetCount: row.targetCount,
      currentCount: row.currentCount,
      progressPct: Math.min(100, Math.round((row.currentCount / row.targetCount) * 100)),
    })),
  };
}

export async function attachAutomatedDealSheet(campaignId: number, url: string): Promise<AutomationDealProgress | null> {
  const normalized = normalizeTrackingSheetInput(url);
  const [updated] = await db
    .update(campaigns)
    .set({
      trackingSheetUrl: normalized.trackingSheetUrl,
      trackingSheetSpreadsheetId: normalized.trackingSheetSpreadsheetId,
      trackingSheetGid: normalized.trackingSheetGid,
      trackingSyncError: null,
      updatedAt: new Date(),
    })
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.automationSource, 'n8n')))
    .returning({ id: campaigns.id });
  return updated ? getAutomatedDealProgress(updated.id) : null;
}

export type SyncAutomatedDealResult = {
  readonly progress: AutomationDealProgress;
  readonly crossedAlertLevel: 70 | 80 | 100 | null;
  readonly syncOk: boolean;
};

export async function syncAutomatedDeal(campaignId: number): Promise<SyncAutomatedDealResult | null> {
  const before = await getAutomatedDealProgress(campaignId);
  if (!before) return null;
  const syncResult = await syncCampaignSheet(campaignId);
  const after = await getAutomatedDealProgress(campaignId);
  if (!after) return null;
  if (!syncResult.ok) {
    return { progress: after, crossedAlertLevel: null, syncOk: false };
  }

  const nextLevel = after.progressPct >= 100 ? 100 : after.progressPct >= 80 ? 80 : after.progressPct >= 70 ? 70 : 0;
  if (nextLevel > after.alertLevel) {
    await db
      .update(campaigns)
      .set({ trackingAlertLevel: nextLevel, updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));
    const crossedAlertLevel = nextLevel === 70 || nextLevel === 80 || nextLevel === 100
      ? nextLevel
      : null;
    return { progress: { ...after, alertLevel: nextLevel }, crossedAlertLevel, syncOk: true };
  }
  return { progress: after, crossedAlertLevel: null, syncOk: true };
}

export type SyncAllAutomatedDealsResult = {
  readonly total: number;
  readonly synced: number;
  readonly failed: number;
  readonly alerts: ReadonlyArray<{
    readonly campaignId: number;
    readonly name: string;
    readonly level: 70 | 80 | 100;
    readonly progressPct: number;
  }>;
};

export async function syncAllAutomatedDeals(): Promise<SyncAllAutomatedDealsResult> {
  const rows = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(
      eq(campaigns.automationSource, 'n8n'),
      isNotNull(campaigns.trackingSheetUrl),
      inArray(campaigns.status, ['propuesta', 'negociacion', 'aprobada', 'activa', 'pendiente_pago']),
    ));

  const limit = createLimit(3);
  const settled = await Promise.allSettled(
    rows.map((row) => limit(() => syncAutomatedDeal(row.id))),
  );
  let synced = 0;
  let failed = 0;
  const alerts: Array<{
    campaignId: number;
    name: string;
    level: 70 | 80 | 100;
    progressPct: number;
  }> = [];

  for (const outcome of settled) {
    if (outcome.status === 'rejected' || !outcome.value) {
      failed++;
      continue;
    }
    if (!outcome.value.syncOk) {
      failed++;
      continue;
    }
    synced++;
    if (outcome.value.crossedAlertLevel !== null) {
      alerts.push({
        campaignId: outcome.value.progress.campaignId,
        name: outcome.value.progress.name,
        level: outcome.value.crossedAlertLevel,
        progressPct: outcome.value.progress.progressPct,
      });
    }
  }

  return { total: rows.length, synced, failed, alerts };
}
