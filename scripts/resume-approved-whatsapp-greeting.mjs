// Explicit operator recovery of ONE approved, unanswered initial greeting.
// Does not replay inbox history, alter timestamps, call AI or change public copy.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { and, eq, inArray, or } from 'drizzle-orm';
const require = createRequire(import.meta.url);
const { db, closeDbPool } = require('../src/lib/db.ts');
const { env } = require('../src/lib/env.ts');
const { intakeConversations: conversations, intakeMessages: messages, intakeOutbox: outbox } = require('../src/db/schema/creatorIntake.ts');
const { INTAKE_INTRO, intakeSimpleReply } = require('../src/lib/intake/welcome.ts');
const { sendIntakeWaha } = require('../src/lib/intake/waha-send.ts');
const { wahaIntakeAccount } = require('../src/lib/intake/waha-account.ts');
const sha = (text) => createHash('sha256').update(text).digest('hex');
let claim;

async function inspect(tx, approval, claimed = false) {
  const [contact] = await tx.select().from(conversations).where(eq(conversations.id, approval.conversationId)).for('update');
  assert(contact && !contact.canonicalId && contact.channel === 'whatsapp', 'invalid-contact');
  assert(env.CREATOR_INTAKE_WHATSAPP_CHATS?.split(',').includes(contact.chatId), 'not-enabled');
  assert(contact.accountId === wahaIntakeAccount(env.CREATOR_INTAKE_WHATSAPP_PHONE, env.CREATOR_INTAKE_WAHA_RUN), 'wrong-account');
  const linked = await tx.select({ id: conversations.id }).from(conversations).where(or(eq(conversations.id, contact.id), eq(conversations.canonicalId, contact.id)));
  const ids = linked.map(row => row.id);
  const history = await tx.select().from(messages).where(inArray(messages.conversationId, ids));
  const business = history.filter(row => row.actor !== 'system');
  assert(business.length === 1, 'conversation-has-moved');
  const original = business[0];
  assert(original.id === approval.messageId && original.actor === 'creator' && sha(original.text) === approval.messageSha256, 'message-changed');
  assert(contact.lastInboundAt?.getTime() === original.occurredAt.getTime(), 'latest-message-changed');
  assert(intakeSimpleReply(original.text)?.intent === 'intake', 'not-a-simple-greeting');
  assert(sha(INTAKE_INTRO.trimEnd()) === approval.greetingSha256, 'approved-copy-changed');
  const effects = await tx.select().from(outbox).where(inArray(outbox.conversationId, ids));
  const own = effects.find(row => row.messageId === original.id && row.kind === 'reply');
  if (own?.status === 'accepted' && own.text === INTAKE_INTRO.trimEnd()) return { duplicate: true };
  assert(contact.state === 'bot' && contact.version === approval.version, 'control-changed');
  assert(claimed ? effects.length === 1 && own?.id === claim && own.status === 'sending' : effects.length === 0, 'prior-effect-needs-review');
  return { contact, original };
}

try {
  const approval = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const mode = process.argv[3] ?? 'preview';
  assert(['preview', 'send'].includes(mode), 'invalid-mode');
  assert(approval.authorized === true && typeof approval.conversationId === 'string' && typeof approval.messageId === 'string', 'missing-approval');
  assert(Number.isInteger(approval.version) && Date.parse(approval.expiresAt) > Date.now()
    && Date.parse(approval.expiresAt) - Date.now() < 3600000, 'expired-approval');
  assert(env.CREATOR_INTAKE_ENABLED && env.CREATOR_INTAKE_WAHA_ENABLED && env.CREATOR_INTAKE_SEND_ENABLED, 'disabled');
  const prepared = await db.transaction(async tx => {
    const check = await inspect(tx, approval);
    if (check.duplicate) return { duplicate: true };
    if (mode === 'preview') return { ready: true, greetingSha256: sha(INTAKE_INTRO.trimEnd()) };
    const [item] = await tx.insert(outbox).values({ conversationId: check.contact.id, messageId: check.original.id,
      conversationVersion: check.contact.version, kind: 'reply', text: INTAKE_INTRO.trimEnd(), status: 'sending' }).returning({ id: outbox.id });
    claim = item.id;
    return { claimed: true };
  });
  if (!prepared.claimed) console.log(JSON.stringify(prepared));
  else {
    const accepted = await db.transaction(async tx => {
      const { contact } = await inspect(tx, approval, true);
      assert(contact && Date.parse(approval.expiresAt) > Date.now(), 'approval-changed');
      // Explicit approval covers this original old greeting only. Preserve its real date.
      const receipt = await sendIntakeWaha({ kind: 'reply', text: INTAKE_INTRO.trimEnd(), channel: 'whatsapp',
        conversationId: contact.id, chatId: contact.chatId, accountId: contact.accountId, lastInboundAt: contact.lastInboundAt });
      await tx.update(outbox).set({ status: receipt ? 'accepted' : 'uncertain', receipt, acceptedAt: receipt ? new Date() : null }).where(eq(outbox.id, claim));
      if (!receipt) await tx.update(conversations).set({ state: 'waiting_human', reason: 'delivery_uncertain', version: contact.version + 1, updatedAt: new Date() }).where(eq(conversations.id, contact.id));
      return Boolean(receipt);
    });
    console.log(JSON.stringify({ accepted, aiRequests: 0 }));
  }
} catch {
  if (claim) {
    // Never blindly retry if receipt/commit failed. Keep the durable claim visible.
    await db.update(outbox).set({ status: 'uncertain' }).where(and(eq(outbox.id, claim), eq(outbox.status, 'sending')));
    const [item] = await db.select().from(outbox).where(eq(outbox.id, claim));
    if (item?.status === 'uncertain') await db.update(conversations).set({ state: 'waiting_human', reason: 'delivery_uncertain', updatedAt: new Date() })
      .where(and(eq(conversations.id, item.conversationId), eq(conversations.state, 'bot')));
  }
  console.log(JSON.stringify({ ok: false, error: 'recovery-needs-review' }));
  process.exitCode = 1;
} finally { await closeDbPool(); }
