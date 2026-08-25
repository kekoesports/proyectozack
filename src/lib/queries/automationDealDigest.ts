import 'server-only';

import { and, eq, inArray, isNull, ne } from 'drizzle-orm';

import { campaigns } from '@/db/schema/campaigns';
import { crmBrands } from '@/db/schema/crmBrands';
import { dealDeliverableTrackers } from '@/db/schema/dealDeliverableTrackers';
import { talents } from '@/db/schema/talents';
import { db } from '@/lib/db';

const ACTIVE_DEAL_STATUSES = [
  'propuesta',
  'negociacion',
  'aprobada',
  'activa',
  'pendiente_pago',
] as const;

const STALE_AFTER_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DealDigestAction =
  | 'sync_error'
  | 'missing_sheet'
  | 'missing_targets'
  | 'empty_sheet'
  | 'completed'
  | 'prepare_invoice'
  | 'stale'
  | 'on_track';

export type AutomationDealDigestRow = {
  readonly campaignId: number;
  readonly name: string;
  readonly brandName: string;
  readonly talentName: string;
  readonly status: string;
  readonly currency: string;
  readonly amountBrand: string;
  readonly amountTalent: string;
  readonly amountInKindTalent: string | null;
  readonly amountInKindCommunity: string | null;
  readonly crmPath: string;
  readonly trackingSheetUrl: string | null;
  readonly syncError: string | null;
  readonly lastSyncedAt: string | null;
  readonly lastEvidenceAddedAt: string | null;
  readonly targetCount: number;
  readonly currentCount: number;
  readonly progressPct: number;
  readonly inactiveDays: number;
  readonly nextAction: DealDigestAction;
};

export type AutomationDealDigest = {
  readonly generatedAt: string;
  readonly staleAfterDays: number;
  readonly summary: {
    readonly total: number;
    readonly syncErrors: number;
    readonly missingSheets: number;
    readonly missingTargets: number;
    readonly emptySheets: number;
    readonly completed: number;
    readonly excludedOldCompleted: number;
    readonly prepareInvoice: number;
    readonly stale: number;
    readonly inProgress: number;
  };
  readonly deals: readonly AutomationDealDigestRow[];
};

export async function getAutomationDealDigest(now = new Date()): Promise<AutomationDealDigest> {
  const rows = await db
    .select({
      campaignId: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      currency: campaigns.currency,
      amountBrand: campaigns.amountBrand,
      amountTalent: campaigns.amountTalent,
      amountInKindTalent: campaigns.amountInKindTalent,
      amountInKindCommunity: campaigns.amountInKindCommunity,
      brandName: crmBrands.name,
      talentName: talents.name,
      trackingSheetUrl: campaigns.trackingSheetUrl,
      syncError: campaigns.trackingSyncError,
      lastSyncedAt: campaigns.lastTrackingSyncAt,
      lastEvidenceAddedAt: campaigns.lastEvidenceAddedAt,
      createdAt: campaigns.createdAt,
      trackerStatus: dealDeliverableTrackers.status,
      targetCount: dealDeliverableTrackers.targetCount,
      currentCount: dealDeliverableTrackers.currentCount,
    })
    .from(campaigns)
    .innerJoin(crmBrands, eq(campaigns.brandId, crmBrands.id))
    .innerJoin(talents, eq(campaigns.talentId, talents.id))
    .leftJoin(dealDeliverableTrackers, and(
      eq(dealDeliverableTrackers.campaignId, campaigns.id),
      ne(dealDeliverableTrackers.status, 'cancelled'),
    ))
    .where(and(
      inArray(campaigns.status, [...ACTIVE_DEAL_STATUSES]),
      isNull(campaigns.archivedAt),
    ));

  const grouped = new Map<number, {
    base: Omit<AutomationDealDigestRow, 'targetCount' | 'currentCount' | 'progressPct' | 'inactiveDays' | 'nextAction'>;
    targetCount: number;
    currentCount: number;
    inactivityBaseline: Date;
  }>();

  for (const row of rows) {
    const current = grouped.get(row.campaignId) ?? {
      base: {
        campaignId: row.campaignId,
        name: row.name,
        brandName: row.brandName,
        talentName: row.talentName,
        status: row.status,
        currency: row.currency,
        amountBrand: row.amountBrand,
        amountTalent: row.amountTalent,
        amountInKindTalent: row.amountInKindTalent,
        amountInKindCommunity: row.amountInKindCommunity,
        crmPath: `/admin/campanas/${row.campaignId}`,
        trackingSheetUrl: row.trackingSheetUrl,
        syncError: row.syncError,
        lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
        lastEvidenceAddedAt: row.lastEvidenceAddedAt?.toISOString() ?? null,
      },
      targetCount: 0,
      currentCount: 0,
      inactivityBaseline: row.lastEvidenceAddedAt ?? row.createdAt,
    };
    if (row.trackerStatus) {
      current.targetCount += row.targetCount ?? 0;
      current.currentCount += row.currentCount ?? 0;
    }
    grouped.set(row.campaignId, current);
  }

  const allDeals = Array.from(grouped.values()).map((row): AutomationDealDigestRow => {
    const progressPct = row.targetCount > 0
      ? Math.min(100, Math.round((row.currentCount / row.targetCount) * 100))
      : 0;
    const inactiveDays = Math.max(0, Math.floor((now.getTime() - row.inactivityBaseline.getTime()) / DAY_MS));
    const nextAction = classifyNextAction({
      trackingSheetUrl: row.base.trackingSheetUrl,
      syncError: row.base.syncError,
      targetCount: row.targetCount,
      currentCount: row.currentCount,
      progressPct,
      inactiveDays,
    });
    return {
      ...row.base,
      targetCount: row.targetCount,
      currentCount: row.currentCount,
      progressPct,
      inactiveDays,
      nextAction,
    };
  }).sort((left, right) => actionPriority(left.nextAction) - actionPriority(right.nextAction));

  // Los tratos terminados hace tiempo permanecen a veces en estados activos
  // mientras se cierra la parte administrativa. No aportan nada al parte
  // diario y tapaban los asuntos que sí requieren atención.
  const deals = allDeals.filter(shouldIncludeInDigest);
  const excludedOldCompleted = allDeals.length - deals.length;

  return {
    generatedAt: now.toISOString(),
    staleAfterDays: STALE_AFTER_DAYS,
    summary: {
      total: deals.length,
      syncErrors: deals.filter((deal) => deal.nextAction === 'sync_error').length,
      missingSheets: deals.filter((deal) => deal.nextAction === 'missing_sheet').length,
      missingTargets: deals.filter((deal) => deal.nextAction === 'missing_targets').length,
      emptySheets: deals.filter((deal) => deal.nextAction === 'empty_sheet').length,
      completed: deals.filter((deal) => deal.nextAction === 'completed').length,
      excludedOldCompleted,
      prepareInvoice: deals.filter((deal) => deal.nextAction === 'prepare_invoice').length,
      stale: deals.filter((deal) => deal.nextAction === 'stale').length,
      inProgress: deals.filter((deal) => deal.nextAction === 'on_track').length,
    },
    deals,
  };
}

export function shouldIncludeInDigest(
  deal: Pick<AutomationDealDigestRow, 'nextAction' | 'inactiveDays'>,
): boolean {
  return !(deal.nextAction === 'completed' && deal.inactiveDays >= STALE_AFTER_DAYS);
}

export function classifyNextAction(input: {
  readonly trackingSheetUrl: string | null;
  readonly syncError: string | null;
  readonly targetCount: number;
  readonly currentCount: number;
  readonly progressPct: number;
  readonly inactiveDays: number;
}): DealDigestAction {
  if (input.syncError) return 'sync_error';
  if (!input.trackingSheetUrl) return 'missing_sheet';
  if (input.targetCount <= 0) return 'missing_targets';
  if (input.currentCount <= 0) return 'empty_sheet';
  if (input.progressPct >= 100) return 'completed';
  if (input.progressPct >= 70) return 'prepare_invoice';
  if (input.inactiveDays >= STALE_AFTER_DAYS) return 'stale';
  return 'on_track';
}

function actionPriority(action: DealDigestAction): number {
  const priorities: Record<DealDigestAction, number> = {
    sync_error: 0,
    missing_sheet: 1,
    missing_targets: 2,
    empty_sheet: 3,
    completed: 4,
    prepare_invoice: 5,
    stale: 6,
    on_track: 7,
  };
  return priorities[action];
}

const DISCORD_MESSAGE_LIMIT = 1_900;

export function formatAutomationDealDigestForDiscord(
  digest: AutomationDealDigest,
): readonly string[] {
  const summary = digest.summary;
  const compact = [
    `⚪ ${summary.missingSheets} sin hoja enlazada`,
    `💤 ${summary.emptySheets} hojas en blanco`,
    `🟣 ${summary.missingTargets} sin objetivos`,
  ].join(' · ');
  const header = [
    '## 📊 SOCIALPRO · KPI REPORTING',
    `📈 **${summary.inProgress} avanzando** · 🟢 **${summary.completed} completados** · 🧾 **${summary.prepareInvoice} para facturar**`,
    `⏸️ **${summary.stale} parados** · 🔴 **${summary.syncErrors} errores**`,
    compact,
    summary.excludedOldCompleted > 0
      ? `🗄️ ${summary.excludedOldCompleted} completados antiguos omitidos`
      : null,
    '🔗 https://socialpro.es/admin/campanas',
  ].filter((line): line is string => line !== null).join('\n');

  const sections = [
    section('🔴 ERRORES DE SINCRONIZACIÓN', byAction(digest, 'sync_error'), errorLine),
    section('🟢 COMPLETADOS', byAction(digest, 'completed'), progressLine),
    section('🧾 LISTOS PARA FACTURAR', byAction(digest, 'prepare_invoice'), progressLine),
    section('⏸️ PARADOS', byAction(digest, 'stale'), staleLine),
    section('📈 EN PROGRESO', byAction(digest, 'on_track'), progressLine),
  ];

  return [header, ...sections.flat()];
}

export function formatAutomationDealDetailForDiscord(
  digest: AutomationDealDigest,
  rawQuery: string,
): readonly string[] {
  const query = normalizeSearch(rawQuery).slice(0, 80);
  if (!query) {
    return ['ℹ️ Escribe `zack detalle <creador, marca o trato>`.'];
  }
  const matches = digest.deals.filter((deal) => normalizeSearch([
    deal.talentName,
    deal.brandName,
    deal.name,
  ].join(' ')).includes(query));
  if (matches.length === 0) {
    return [`🔎 No encuentro ningún trato activo para **${safeDiscordText(rawQuery, 80)}**.`];
  }
  return chunkLines(
    `## 🔎 DETALLE · ${safeDiscordText(rawQuery, 80)}`,
    matches.map(detailLine),
  );
}

function byAction(
  digest: AutomationDealDigest,
  action: DealDigestAction,
): readonly AutomationDealDigestRow[] {
  return digest.deals.filter((deal) => deal.nextAction === action);
}

function section(
  title: string,
  deals: readonly AutomationDealDigestRow[],
  line: (deal: AutomationDealDigestRow) => string,
): readonly string[] {
  if (deals.length === 0) return [];
  return chunkLines(`### ${title} · ${deals.length}`, deals.map(line));
}

function chunkLines(title: string, lines: readonly string[]): readonly string[] {
  const chunks: string[] = [];
  let current = title;
  for (const line of lines) {
    const candidate = `${current}\n${line}`;
    if (candidate.length <= DISCORD_MESSAGE_LIMIT) {
      current = candidate;
      continue;
    }
    chunks.push(current);
    current = `${title} · continúa\n${line}`;
  }
  chunks.push(current.slice(0, DISCORD_MESSAGE_LIMIT));
  return chunks;
}

function dealTitle(deal: AutomationDealDigestRow): string {
  const parties = `${safeDiscordText(deal.talentName, 70)} × ${safeDiscordText(deal.brandName, 70)}`;
  return `**${parties}** · ${safeDiscordText(deal.name, 110)}`;
}

function progressText(deal: AutomationDealDigestRow): string {
  const filled = Math.max(0, Math.min(5, Math.round(deal.progressPct / 20)));
  const bar = `${'▰'.repeat(filled)}${'▱'.repeat(5 - filled)}`;
  return `\`${bar}\` **${deal.progressPct}%** · ${deal.currentCount}/${deal.targetCount}`;
}

function progressLine(deal: AutomationDealDigestRow): string {
  return `• ${dealTitle(deal)} — ${progressText(deal)}`;
}

function staleLine(deal: AutomationDealDigestRow): string {
  return `${progressLine(deal)} · **${deal.inactiveDays} días sin avance**`;
}

function errorLine(deal: AutomationDealDigestRow): string {
  const reason = safeDiscordText(deal.syncError ?? 'Motivo no disponible.', 220);
  return `• ${dealTitle(deal)}\n  ↳ ${reason}`;
}

function detailLine(deal: AutomationDealDigestRow): string {
  const actionLabels: Record<DealDigestAction, string> = {
    sync_error: '🔴 error',
    missing_sheet: '⚪ sin hoja',
    missing_targets: '🟣 sin objetivos',
    empty_sheet: '💤 hoja en blanco',
    completed: '🟢 completado',
    prepare_invoice: '🧾 para facturar',
    stale: '⏸️ parado',
    on_track: '📈 avanzando',
  };
  const reason = deal.syncError ? `\n  ↳ ${safeDiscordText(deal.syncError, 220)}` : '';
  return [
    `• ${dealTitle(deal)} — ${actionLabels[deal.nextAction]}`,
    `  ${deal.targetCount > 0 ? progressText(deal) : 'sin objetivos configurados'} · ${deal.inactiveDays} días desde el último avance`,
    `  🔗 https://socialpro.es${deal.crmPath}${reason}`,
  ].join('\n');
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es');
}

function safeDiscordText(value: string, maxLength: number): string {
  const safe = value
    .replace(/https?:\/\/\S+/gi, '[enlace]')
    .replace(/@/g, '@\u200b')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/([\\*_~|`])/g, '\\$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return safe.length <= maxLength ? safe : `${safe.slice(0, maxLength - 1)}…`;
}
