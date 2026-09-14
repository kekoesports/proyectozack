'use strict';
const { z } = require('zod');
const { classify, Message } = require('./policy.cjs');
function processor({ api, store, cutoff, now = Date.now }) {
  async function process(message, labels) {
    const parsed = Message.safeParse(message);
    if (!parsed.success) throw Error('invalid_message');
    message = parsed.data;
    return store.lock('thread:' + message.threadId, async () => {
      const key = 'thread:' + message.threadId;
      const old = await store.get(key);
      if (old) {
        const label = old.status === 'sent' ? labels.sent : old.status === 'review' ? labels.review : labels.uncertain;
        await api.tag(message.threadId, label);
        return { status: 'duplicate', previous: old.status };
      }
      const thread = await api.request('/threads/' + message.threadId + '?format=full');
      const decision = classify(message, thread, cutoff, now());
      if (decision.action === 'ignore') {
        await api.tag(message.threadId, labels.ignored);
        return { status: 'ignored', reason: decision.reason };
      }
      if (decision.action === 'review') {
        await api.tag(message.threadId, labels.review);
        await store.put(key, { status: 'review', reason: decision.reason, at: new Date(now()).toISOString() });
        return { status: 'review', reason: decision.reason };
      }
      const dailyKey = 'daily:' + new Date(now()).toISOString().slice(0,10);
      const used = await store.get(dailyKey) || 0;
      if (used >= 20) { await api.tag(message.threadId, labels.review); return { status: 'daily_limit' }; }
      // Durable claim precedes the external effect; crash recovery never repeats it.
      await store.put(key, { status: 'sending', reason: decision.reason, at: new Date(now()).toISOString() });
      await store.put(dailyKey, used + 1);
      try {
        const receipt = await api.send(message, decision);
        await store.put(key, { status: 'sent', at: new Date(now()).toISOString(), receiptId: receipt.id, topic: decision.reason });
      } catch {
        await store.put(key, { status: 'uncertain', at: new Date(now()).toISOString() });
        await api.tag(message.threadId, labels.uncertain);
        return { status: 'uncertain' };
      }
      await api.tag(message.threadId, labels.sent);
      return { status: 'sent', topic: decision.reason };
    });
  }
  async function poll() {
    return store.lock('poll', async () => {
      await api.identity();
      const labels = await api.labelIds();
      const q = `in:inbox after:${Math.floor(cutoff / 1000)} -label:"SocialPro/Atención personal" -label:"SocialPro/Respondido" -label:"SocialPro/Envío por comprobar" -label:"SocialPro/No automatizar"`;
      const listing = z.object({ messages: z.array(z.object({ id: z.string().regex(/^[a-f0-9]+$/) })).max(20).optional(), nextPageToken: z.string().optional() })
        .parse(await api.request('/messages?maxResults=20&q=' + encodeURIComponent(q)));
      const results = [];
      for (const row of listing.messages || []) {
        const message = await api.request('/messages/' + row.id + '?format=full');
        results.push(await process(message, labels));
      }
      const totals = results.reduce((out,r) => { out[r.status] = (out[r.status] || 0) + 1; return out; }, {});
      return { at: new Date(now()).toISOString(), inspected: results.length, totals, moreAvailable: !!listing.nextPageToken };
    });
  }
  return { poll, process };
}
module.exports = { processor };
