import { eq, inArray } from 'drizzle-orm';
import { intakeConversations, intakeMessages } from '@/db/schema/creatorIntake';
import { intakePeerAliases } from '@/db/schema/intakeReliability';
import { IntakeIdentityPlan } from '@/lib/schemas/intakeReconciliation';
import { IntakeProfile } from '@/lib/schemas/creatorIntake';
import type { IntakeDatabase } from './repository';
import { wahaIntakeAccount } from './waha-account';

/** Operator-only repair using verified provider mappings and optimistic versions.
 * Retains every original row/message/outbox; canonicalId links historical threads.
 */
export async function reconcileWahaIdentities(database: IntakeDatabase, raw: unknown) {
  const parsed = IntakeIdentityPlan.safeParse(raw);
  if (!parsed.success) throw new Error('invalid-identity-plan');
  const plan = parsed.data;
  const account = wahaIntakeAccount(plan.companyPhone);
  const phones = [...new Set(plan.bindings.map((entry) => entry.phone))];
  return database.transaction(async (tx) => {
    let linked = 0;
    for (const phone of phones) {
      const group = plan.bindings.filter((entry) => entry.phone === phone);
      const rows = await tx.select().from(intakeConversations).where(inArray(intakeConversations.id,
        group.map((entry) => entry.conversationId))).for('update');
      if (rows.length !== group.length || rows.some((row) => row.channel !== 'whatsapp'
        || row.version !== group.find((entry) => entry.conversationId === row.id)?.version)) throw new Error('identity-plan-stale');
      rows.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
      const latest = rows.at(-1);
      if (!latest) continue;
      const root = rows.find((row) => row.accountId === account && row.chatId === phone.slice(1)) ?? latest;
      const combined = rows.reduce<IntakeProfile>((current, row) => ({ ...current, ...row.profile,
        ...(current.gamblingPreferences || row.profile.gamblingPreferences ? { gamblingPreferences: {
          ...current.gamblingPreferences, ...row.profile.gamblingPreferences } } : {}),
        ...(current.instagramMetrics || row.profile.instagramMetrics ? { instagramMetrics: {
          ...current.instagramMetrics, ...row.profile.instagramMetrics, source: 'declared' } } : {}),
      }), {});
      const socials = [...new Map(rows.flatMap((row) => row.profile.socials ?? []).map((social) => [social.url, social])).values()];
      if (socials.length) combined.socials = socials;
      const profile = IntakeProfile.safeParse(combined);
      if (!profile.success) throw new Error('profile-conflict-needs-review');
      const controls = await tx.select().from(intakeMessages).where(inArray(intakeMessages.conversationId, rows.map((row) => row.id)));
      // Do not override a current explicit handoff. A newer manual resume is respected.
      const lastControl = controls.filter((row) => row.actor === 'system' || row.actor === 'owner')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const latestPause = rows.filter((row) => row.state === 'human' || row.state === 'waiting_human').at(-1);
      const explicitResume = lastControl?.text === 'Asistente disponible para el próximo mensaje nuevo.'
        && (!latestPause || lastControl.createdAt >= latestPause.updatedAt);
      const controlState = explicitResume ? 'bot' : latestPause?.state ?? latest.state;
      const state = rows.some((row) => row.state === 'closed' && row.reason === 'stop_requested') ? 'closed' : controlState;
      await tx.update(intakeConversations).set({ accountId: account, chatId: phone.slice(1), canonicalId: null,
        state, profile: profile.data, version: root.version + 1, updatedAt: new Date(),
        lastInboundAt: rows.reduce<Date | null>((max, row) => row.lastInboundAt && (!max || row.lastInboundAt > max) ? row.lastInboundAt : max, null),
        reason: state === 'closed' ? 'stop_requested' : state === 'human' ? 'manual_control' : latest.reason,
      }).where(eq(intakeConversations.id, root.id));
      for (const row of rows) {
        if (row.id === root.id) continue;
        await tx.update(intakeConversations).set({ canonicalId: root.id }).where(eq(intakeConversations.id, row.id));
        linked++;
      }
      const aliases = new Set([`pn:${phone}`, `${phone.slice(1)}@c.us`, ...group.flatMap((entry) => entry.aliases)]);
      for (const alias of aliases) {
        const key = `${account}:${alias}`;
        await tx.insert(intakePeerAliases).values({ key, conversationId: root.id }).onConflictDoNothing();
        const [stored] = await tx.select().from(intakePeerAliases).where(eq(intakePeerAliases.key, key));
        if (stored?.conversationId !== root.id) throw new Error('alias-conflict-needs-review');
      }
    }
    return { contacts: phones.length, linkedHistories: linked, deletedRows: 0 };
  });
}
