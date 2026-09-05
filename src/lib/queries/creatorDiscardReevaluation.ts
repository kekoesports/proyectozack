import { and, desc, eq, gt, inArray, lte, or } from 'drizzle-orm';
import { creatorAccounts, creatorAccountObservations, creatorFeedback, creatorIdentities, targets } from '@/db/schema';
import type { db } from '@/lib/db';
import type { DiscoveredCreatorInput } from './creatorIdentity';
import { canReevaluateDiscard } from '@/lib/targets/discard-reevaluation';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Account = typeof creatorAccounts.$inferSelect;
type Target = typeof targets.$inferSelect;

/** Caller holds the target row lock also used by manual feedback; observation/history expiry is respected. */
export async function reevaluateDiscardedCreator(
  tx: Transaction, target: Target, account: Account, input: DiscoveredCreatorInput, now: Date,
): Promise<boolean> {
  if (target.status !== 'descartado' || !input.runId || !input.searchConfig) return false;
  const [identity] = await tx.select({ talentId: creatorIdentities.talentId }).from(creatorIdentities)
    .where(eq(creatorIdentities.id, account.creatorId)).limit(1);
  if (!identity || identity.talentId !== null) return false;
  // Permanent commercial objections anywhere in history are never inferred to have expired.
  const [objection] = await tx.select({ id: creatorFeedback.id }).from(creatorFeedback).where(and(
    or(eq(creatorFeedback.targetId, target.id), eq(creatorFeedback.creatorId, account.creatorId)), eq(creatorFeedback.status, 'descartado'),
    inArray(creatorFeedback.reason, ['already_represented', 'not_interesting', 'brand_incompatible']),
  )).limit(1);
  if (objection) return false;
  // Serial IDs are allocated by INSERT after the same target lock; transaction-start timestamps can invert.
  const [decision] = await tx.select().from(creatorFeedback).where(eq(creatorFeedback.targetId, target.id))
    .orderBy(desc(creatorFeedback.id)).limit(1);
  if (!decision || !decision.actorId || decision.status !== 'descartado'
    || !['audience_low', 'inactive'].includes(decision.reason)) return false;
  const [baseline] = await tx.select().from(creatorAccountObservations).where(and(
    eq(creatorAccountObservations.accountId, account.id), lte(creatorAccountObservations.observedAt, decision.createdAt),
    gt(creatorAccountObservations.expiresAt, now),
  )).orderBy(desc(creatorAccountObservations.observedAt), desc(creatorAccountObservations.id)).limit(1);
  if (!baseline || !canReevaluateDiscard({ platform: target.platform, reason: decision.reason,
    discardedAt: decision.createdAt, baseline: baseline.fields, incoming: input.fields,
    searchConfig: input.searchConfig, now })) return false;
  // Actor is intentionally null: the audit trail must not attribute an automated decision to a person.
  await tx.insert(creatorFeedback).values({ targetId: target.id, creatorId: account.creatorId, actorId: null,
    previousStatus: 'descartado', status: 'pendiente', reason: 'evidence_improved',
    note: `Reevaluación automática: ${decision.reason}; decisión ${decision.id}; observación ${baseline.id}; ejecución ${input.runId}. Revisión humana pendiente.`,
    createdAt: now });
  await tx.update(targets).set({ status: 'pendiente', qualificationStatus: 'review', updatedAt: now })
    .where(and(eq(targets.id, target.id), eq(targets.status, 'descartado')));
  return true;
}
