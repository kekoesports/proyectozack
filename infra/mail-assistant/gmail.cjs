'use strict';
const { z } = require('zod');
const { MAILBOX } = require('./policy.cjs');
const Config = z.object({ clientId: z.string().min(5), clientSecret: z.string().min(5), refreshToken: z.string().min(5) });
function gmail(rawConfig) {
  const config = Config.parse(rawConfig);
  let access = '', until = 0;
  async function json(url, init = {}) {
    const r = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw Error('google_http_' + r.status);
    if (r.status === 204) return {};
    if (Number(r.headers.get('content-length')) > 2000000) throw Error('provider_response_too_large');
    let length = 0; const chunks = [];
    for await (const chunk of r.body) { length += chunk.length; if (length > 2000000) throw Error('provider_response_too_large'); chunks.push(chunk); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  async function token() {
    if (Date.now() < until) return access;
    const r = await json('https://oauth2.googleapis.com/token', { method: 'POST',
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: config.refreshToken, client_id: config.clientId, client_secret: config.clientSecret }) });
    const p = z.object({ access_token: z.string().min(10), expires_in: z.number().positive() }).parse(r);
    access = p.access_token; until = Date.now() + Math.max(0, p.expires_in - 60) * 1000; return access;
  }
  async function request(path, method = 'GET', body) {
    if (!/^\/(?:profile|labels|messages|threads)(?:[/?]|$)/.test(path)) throw Error('path_not_allowed');
    return json('https://gmail.googleapis.com/gmail/v1/users/me' + path, { method,
      headers: { Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  async function identity() {
    const p = z.object({ emailAddress: z.literal(MAILBOX) }).safeParse(await request('/profile'));
    if (!p.success) throw Error('wrong_mailbox');
  }
  async function labelIds() {
    const list = z.object({ labels: z.array(z.object({ id: z.string(), name: z.string() })) }).parse(await request('/labels')).labels;
    const ids = {};
    for (const [key,name] of Object.entries({ review: 'SocialPro/Atención personal', sent: 'SocialPro/Respondido', uncertain: 'SocialPro/Envío por comprobar', ignored: 'SocialPro/No automatizar' })) {
      const old = list.find(x => x.name === name);
      ids[key] = old?.id || z.object({ id: z.string() }).parse(await request('/labels','POST',{ name, labelListVisibility:'labelShow', messageListVisibility:'show' })).id;
    }
    return ids;
  }
  async function tag(threadId, labelId) { await request('/threads/' + threadId + '/modify', 'POST', { addLabelIds: [labelId] }); }
  async function send(message, decision) {
    // No retries: a timeout may follow an accepted send. The caller preserves uncertainty.
    const subject = /^re:/i.test(decision.subject) ? decision.subject : 'Re: ' + decision.subject;
    const raw = [`From: SocialPro <${MAILBOX}>`, `To: ${decision.to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      `In-Reply-To: ${decision.reference}`, `References: ${decision.reference}`,
      `Message-ID: <socialpro-faq-${message.id}@socialpro.es>`, 'Auto-Submitted: auto-replied',
      'X-Auto-Response-Suppress: All', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64', '', Buffer.from(decision.body).toString('base64').match(/.{1,76}/g).join('\r\n')].join('\r\n');
    return z.object({ id: z.string(), threadId: z.string() }).parse(await request('/messages/send', 'POST', { threadId: message.threadId, raw: Buffer.from(raw).toString('base64url') }));
  }
  return { request, identity, labelIds, tag, send };
}
module.exports = { gmail };
