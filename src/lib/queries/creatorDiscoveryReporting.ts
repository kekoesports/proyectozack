import { and, desc, eq, gt, isNull, lte, or } from 'drizzle-orm';
import { automationRegistry, creatorAccountObservations, creatorAccounts, creatorDigestOutbox, targets } from '@/db/schema';
import type { CreatorDiscoveryPlatformResult } from '@/db/schema/creatorDiscoveryRuns';
import { db } from '@/lib/db';
import { enqueueCreatorDigest } from '@/lib/queries/creatorDigest';
import { formatCreatorDigest } from '@/lib/targets/creator-digest';
import { CREATOR_FIT_SCORE_VERSION } from '@/lib/targets/creator-fit-score';
import { creatorObservationSchema } from '@/lib/schemas/creator-search-profile';

type ProcessingCounts = { scoring: number; enrichment: number; noPublicBio: number; invalidPublicInput: number };
function processingCounts(rows: readonly { fields: Readonly<Record<string, unknown>> }[], startedAt: Date, now: Date): ProcessingCounts {
  const counts: ProcessingCounts = { scoring: 0, enrichment: 0, noPublicBio: 0, invalidPublicInput: 0 };
  const marker = (field: unknown, source: string): string | null => {
    const parsed = creatorObservationSchema.safeParse(field);
    if (!parsed.success) return null;
    const value = parsed.data;
    if (value.status !== 'available' || value.source !== source || value.confidence !== 'HIGH'
      || value.observed_at === null || typeof value.value !== 'string') return null;
    const observed = Date.parse(value.observed_at), synced = Date.parse(value.synced_at);
    return observed >= startedAt.getTime() && observed <= synced && synced <= now.getTime() ? value.value : null;
  };
  for (const row of rows) {
    if (marker(row.fields['processing:scoring'], 'crm:scoreCreatorFit') === CREATOR_FIT_SCORE_VERSION) counts.scoring++;
    const enrichment = marker(row.fields['processing:enrichment'], 'crm:enrichPublicCreator');
    if (enrichment === 'public_bio_extracted_for_review') counts.enrichment++;
    else if (enrichment === 'no_public_bio_available') counts.noPublicBio++;
    else if (enrichment === 'invalid_public_input') counts.invalidPublicInput++;
  }
  return counts;
}

export async function recordCreatorRunReporting(runId: number, startedAt: Date, results: readonly CreatorDiscoveryPlatformResult[],
  evidence?: Readonly<{ completedAt: Date; recovered?: boolean }>): Promise<void> {
  const writtenAt = new Date(), now = evidence?.completedAt ?? writtenAt;
  if (!Number.isFinite(startedAt.getTime()) || !Number.isFinite(now.getTime())
    || now < startedAt || now > writtenAt) throw new Error('creator_reporting_invalid_evidence_time');
  const durationMs = Math.min(2_147_483_647, now.getTime() - startedAt.getTime());
  // Recovery cannot overwrite a later run, preflight observation or confirmed Discord ACK.
  const notNewer = or(isNull(automationRegistry.observedAt), lte(automationRegistry.observedAt, now));
  if (!notNewer) throw new Error('creator_reporting_evidence_guard_missing');
  for (const result of results) {
    const status = result.status === 'skipped' ? 'PAUSED' : result.status === 'success' ? 'HEALTHY' : result.status === 'failed' ? 'ERROR' : 'DEGRADED';
    const values = { name: `${result.platform} Discovery`, type: 'discovery', purpose: 'Prospección autorizada desde API oficial; revisión humana antes de contacto.',
      status, enabled: result.status !== 'skipped', lastStartedAt: startedAt, durationMs, itemsProcessed: result.found,
      lastError: result.error, version: 'creator-discovery-1', evidence: `creator_discovery_runs:${runId}; ${(result.warnings ?? []).join(', ')}`,
      observedAt: now, updatedAt: writtenAt,
      ...(status === 'HEALTHY' ? { lastSuccessAt: now } : status === 'ERROR' || status === 'DEGRADED' ? { lastErrorAt: now } : {}),
      usage: { requests: null, searchUnits: null, generalUnits: null, costEur: null, source: 'Reservas de intentos en creator_daily_api_usage; no cuota restante del proveedor.' },
    } as const;
    await db.insert(automationRegistry).values({ key: `creator:${result.platform}`, ...values })
      .onConflictDoUpdate({ target: automationRegistry.key, set: values, setWhere: notNewer });
  }
  // Per-run immutable observations, not the accumulated account fields or the top-four prospect list.
  const observations = await db.select({ fields: creatorAccountObservations.fields }).from(creatorAccountObservations)
    .where(and(eq(creatorAccountObservations.runId, runId), gt(creatorAccountObservations.expiresAt, writtenAt)));
  const processed = processingCounts(observations, startedAt, now);
  const writeStage = async (key: 'enrichment' | 'scoring' | 'digest', queued = false): Promise<void> => {
    const count = key === 'scoring' ? processed.scoring : key === 'enrichment' ? processed.enrichment : 0;
    const invalid = key === 'enrichment' && processed.invalidPublicInput > 0;
    const didProcess = count > 0;
    const incomplete = results.some((result) => result.status === 'failed' || result.status === 'partial');
    const status = key === 'digest' ? queued ? 'NEVER_RUN' : 'PAUSED'
      : invalid ? didProcess ? 'DEGRADED' : 'ERROR'
        : didProcess ? incomplete ? 'DEGRADED' : 'HEALTHY' : 'PAUSED';
    const detail = key === 'digest' ? queued ? '; aviso en cola, todavía no confirma entrega' : '; canal no configurado'
      : key === 'enrichment' ? `; ${count} extracciones verificadas; ${processed.noPublicBio} sin biografía pública; ${processed.invalidPublicInput} entradas inválidas`
        : `; ${count} cálculos verificados de ${CREATOR_FIT_SCORE_VERSION}`;
    const values = { name: `Creator Discovery — ${key}`, type: key,
      purpose: key === 'digest' ? 'Cola interna; HEALTHY sólo después de ACK real de Discord.' : 'Procesamiento determinista de evidencia autorizada; no entrenamiento autónomo.',
      status, enabled: key === 'digest' ? queued : didProcess || invalid, version: 'creator-discovery-1', observedAt: now, updatedAt: writtenAt,
      lastStartedAt: startedAt, durationMs,
      ...(key !== 'digest' ? { itemsProcessed: count } : {}),
      ...(key !== 'digest' && status === 'HEALTHY' ? { lastSuccessAt: now, lastError: null }
        : key !== 'digest' && (status === 'DEGRADED' || status === 'ERROR') ? { lastErrorAt: now,
          lastError: invalid ? 'Entrada pública no válida; extracción no confirmada para todas las cuentas.'
            : 'Ejecución incompleta; consultar incidencias de las plataformas.' }
          : key !== 'digest' ? { lastError: null } : {}),
      evidence: `creator_discovery_runs:${runId}${detail}` } as const;
    await db.insert(automationRegistry).values({ key: `creator:${key}`, ...values })
      .onConflictDoUpdate({ target: automationRegistry.key, set: {
        ...values,
        // A previous ACK remains historical evidence; it cannot confirm this new pending delivery.
        ...(key === 'digest' && queued ? { status: 'DEGRADED' as const } : {}),
      }, setWhere: notNewer });
  };
  // A projection failure leaves no outbox yet, so bounded reporting-only recovery can retry this run.
  await writeStage('enrichment');
  await writeStage('scoring');
  // Current target labels/scores are not evidence of an older recovered run.
  const top = evidence?.recovered ? [] : await db.select({ name: targets.fullName, username: targets.username, platform: targets.platform, score: targets.fitScore })
    .from(creatorAccountObservations).innerJoin(creatorAccounts, eq(creatorAccounts.id, creatorAccountObservations.accountId))
    .innerJoin(targets, eq(targets.id, creatorAccounts.targetId))
    .where(and(eq(creatorAccountObservations.runId, runId), gt(creatorAccountObservations.expiresAt, writtenAt), eq(targets.status, 'pendiente')))
    .orderBy(desc(targets.fitScore)).limit(4);
  const content = formatCreatorDigest({ runId, results, durationMs,
    top: top.map((row) => ({ name: row.name ?? row.username, platform: row.platform, score: row.score })) });
  const queued = await enqueueCreatorDigest(`creator-run:${runId}`, evidence?.recovered
    ? content.replace('Ejecución #', 'Informe recuperado, sin nueva búsqueda #').slice(0, 1800) : content, runId);
  // enqueue is idempotent but its boolean alone does not distinguish pending from previously sent.
  const [delivery] = await db.select({ status: creatorDigestOutbox.status, messageId: creatorDigestOutbox.messageId,
    sentAt: creatorDigestOutbox.sentAt }).from(creatorDigestOutbox).where(eq(creatorDigestOutbox.eventKey, `creator-run:${runId}`));
  if ((queued && !delivery) || (delivery && !['pending', 'sent'].includes(delivery.status))) {
    throw new Error('creator_digest_outcome_unconfirmed');
  }
  const alreadySent = delivery?.status === 'sent';
  if (alreadySent && (!delivery.messageId || !/^\d{17,20}$/.test(delivery.messageId)
    || !delivery.sentAt || !Number.isFinite(delivery.sentAt.getTime()) || delivery.sentAt > writtenAt)) {
    throw new Error('creator_digest_receipt_unconfirmed');
  }
  if (!alreadySent) await writeStage('digest', queued); // A confirmed receipt is never demoted during replay.
}
