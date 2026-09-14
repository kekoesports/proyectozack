'use strict';
// Deliberately narrow FAQ matching: unmatched text always needs a person.
const { z } = require('zod');
const MAILBOX = 'pcamacho@socialpro.es';
const header = z.object({ name: z.string().max(120), value: z.string().max(16000) });
const part = z.lazy(() => z.object({ mimeType: z.string().optional(), filename: z.string().optional(),
  headers: z.array(header).max(250).optional(), body: z.object({ data: z.string().max(500000).optional(), attachmentId: z.string().optional() }).optional(),
  parts: z.array(part).max(50).optional() }));
const Message = z.object({ id: z.string().regex(/^[a-f0-9]+$/), threadId: z.string().regex(/^[a-f0-9]+$/),
  internalDate: z.string().regex(/^\d+$/), labelIds: z.array(z.string()).optional(), payload: part });
const Thread = z.object({ id: z.string(), messages: z.array(Message).min(1).max(100) });
const FAQ = [
  { key: 'agency', questions: ['que es socialpro', 'me gustaria saber mas sobre socialpro', 'que ofreceis a los creadores', 'que ofreceis a un creador'],
    answer: 'SocialPro es una agencia de marketing y gestión de talento especializada en gaming, esports e iGaming. Ayudamos a creadores con representación, colaboraciones con marcas y gestión de campañas. También trabajamos gestión de YouTube y una línea de TikTok LIVE. Si te interesa que valoremos tu perfil, puedes responder con tus redes más activas.' },
  { key: 'youtube', questions: ['gestionais canales de youtube', 'tambien gestionais youtube', 'ofreceis gestion de youtube'],
    answer: 'Sí, SocialPro ofrece gestión de canales de YouTube: trabajo editorial, coordinación de producción y desarrollo del canal. Compártenos el enlace y qué parte de la gestión buscas delegar. El equipo revisará tu caso y acordará personalmente el alcance y las condiciones.' },
  { key: 'metrics', questions: ['que estadisticas necesitais', 'que metricas necesitais', 'que son las geo stats'],
    answer: 'Pedimos estadísticas de los últimos 30 días según tus redes. Twitch/Kick: stats de los últimos 30 días y GEO stats. Instagram: visualizaciones de historias y reels y GEO stats. YouTube: visualizaciones y países de la audiencia. TikTok: contenido, audiencia y directos si los haces. Las GEO stats muestran los países de tu audiencia. Puedes enviar capturas o un informe por este correo para revisión personal.' },
  { key: 'tiktok', questions: ['que buscais en tiktok live', 'que requisitos teneis para tiktok live'],
    answer: 'Para la línea de TikTok nos interesan perfiles que hagan LIVE y batallas con más de 30 espectadores de media. Pueden encajar en esta línea aunque no hagan CS2 o casino. El equipo revisa cada candidatura; el encaje no garantiza campañas ni ingresos.' },
];
function headers(message) {
  const result = {};
  for (const h of message.payload.headers || []) {
    const key = h.name.toLowerCase();
    result[key] = result[key] === undefined ? h.value : result[key] + ', ' + h.value;
  }
  return result;
}
function address(value) {
  if (typeof value !== 'string' || /[\r\n,;]/.test(value)) return null;
  const match = value.trim().match(/^(?:[^<>]*<)?([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?$/);
  return match ? match[1].toLowerCase() : null;
}
function content(payload, depth = 0) {
  if (depth > 8 || payload.filename || payload.body?.attachmentId) return { attachment: true, texts: [] };
  const children = (payload.parts || []).map(p => content(p, depth + 1));
  return { attachment: children.some(c => c.attachment), texts: [
    ...(payload.mimeType === 'text/plain' && payload.body?.data ? [Buffer.from(payload.body.data, 'base64url').toString('utf8')] : []),
    ...children.flatMap(c => c.texts),
  ] };
}
function classify(raw, rawThread, cutoff, now = Date.now()) {
  const p = Message.safeParse(raw), t = Thread.safeParse(rawThread);
  if (!p.success || !t.success) return { action: 'ignore', reason: 'invalid_provider_data' };
  const m = p.data, h = headers(m), from = address(h.from);
  if (t.data.id !== m.threadId || !t.data.messages.some(x => x.id === m.id)) return { action: 'ignore', reason: 'thread_mismatch' };
  if (Number(m.internalDate) <= cutoff || Number(m.internalDate) > now + 60000) return { action: 'ignore', reason: 'outside_cutoff' };
  if (!(m.labelIds || []).includes('INBOX') || (m.labelIds || []).some(x => ['SPAM','TRASH','SENT','DRAFT'].includes(x))) return { action: 'ignore', reason: 'not_incoming' };
  if (!from || from === MAILBOX || /(?:no.?reply|mailer-daemon|postmaster)@/i.test(from)) return { action: 'ignore', reason: 'automatic_or_own_sender' };
  if (h['auto-submitted'] && h['auto-submitted'].toLowerCase() !== 'no' || h['list-unsubscribe'] || h['list-id'] || /bulk|list|junk/i.test(h.precedence || '')) return { action: 'ignore', reason: 'automatic_mail' };
  if (address(h.to) !== MAILBOX || h.cc || h.bcc || h['reply-to'] && address(h['reply-to']) !== from) return { action: 'review', reason: 'recipient_review' };
  const auth = (m.payload.headers || []).find(x => x.name.toLowerCase() === 'authentication-results')?.value || '';
  if (!/^mx\.google\.com;/i.test(auth.trim()) || !/\bdmarc=pass\b/i.test(auth)) return { action: 'review', reason: 'sender_auth_unverified' };
  if (t.data.messages.some(x => x.id !== m.id && ((x.labelIds || []).includes('SENT') || address(headers(x).from) === MAILBOX))) return { action: 'review', reason: 'existing_reply' };
  if (t.data.messages.some(x => x.id !== m.id)) return { action: 'review', reason: 'existing_conversation' };
  const body = content(m.payload);
  if (body.attachment || body.texts.length !== 1) return { action: 'review', reason: 'attachment_or_complex_body' };
  const question = body.texts[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/^(hola|buenas|buenos dias)[,! .\n]+/, '').replace(/[¿?!.]+/g, '').replace(/\s+/g, ' ').trim();
  const topic = FAQ.find(f => f.questions.includes(question));
  if (!topic) return { action: 'review', reason: 'outside_faq' };
  if (!/^<[^<>\s\r\n]{3,240}>$/.test(h['message-id'] || '') || !h.subject || h.subject.length > 200 || /[\r\n]/.test(h.subject)) return { action: 'review', reason: 'reply_headers_invalid' };
  return { action: 'reply', reason: topic.key, to: from, subject: h.subject, reference: h['message-id'],
    body: `Hola,\n\n${topic.answer}\n\nEsta es una respuesta automática del asistente de SocialPro. Puedes continuar por este correo para que el equipo revise tu caso.\n\nSocialPro\nhttps://socialpro.es` };
}
module.exports = { MAILBOX, FAQ, Message, Thread, classify, headers, address };
