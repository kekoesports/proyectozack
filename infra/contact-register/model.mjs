import { createHash } from 'node:crypto';

export const extraHeaders = ['Origen', 'Teléfono / WhatsApp', 'Instagram', 'TikTok',
  'Stats y periodo · declarados', 'GEO stats · declaradas', 'Evidencias / adjuntos',
  'Mensaje / contexto recibido', 'Actualizado', 'Ficha CRM', 'IDs de origen', 'Huella de sincronización'];
export const text = (v) => v == null ? '' : String(v).trim();
export const join = (values) => [...new Set(values.map(text).filter(Boolean))].join('\n');
export function isSynthetic(item) {
  return /^\s*\[?(TEST|QA|E2E)(?:\b|_)/i.test(item.name ?? '')
    || /^SOCIALPRO YELLOW AUTOMATION TEST\b/i.test(text(item.name))
    || /@(example\.(com|org|net)|resend\.dev|[^@]*\.test)$/i.test(text(item.email))
    || new Date(item.createdAt).getTime() > Date.now() + 86400000;
}
export function networks(input) {
  const found = text(input).match(/(?:https?:\/\/|www\.)[^\s<>]+/gi) ?? [];
  const valid = [];
  for (let value of found) {
    value = value.replace(/[),.;\]}]+$/, '');
    try {
      const url = new URL(value.startsWith('www.') ? `https://${value}` : value);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) continue;
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      const platform = ['youtube.com', 'youtu.be'].includes(host) ? 'YouTube'
        : host === 'twitch.tv' ? 'Twitch' : host === 'kick.com' ? 'Kick'
          : host === 'instagram.com' ? 'Instagram' : host === 'tiktok.com' ? 'TikTok'
            : ['x.com', 'twitter.com', 'discord.gg'].includes(host) ? 'Otra' : null;
      if (!platform || !url.pathname.replaceAll('/', '')) continue;
      url.protocol = 'https:'; url.hostname = host; url.hash = ''; url.search = '';
      valid.push({ platform, url: url.href.replace(/\/$/, '') });
    } catch { /* An invalid shared URL remains in the original message. */ }
  }
  return [...new Map(valid.map((item) => [item.url.toLowerCase(), item])).values()];
}
function declaredChannel(input) {
  const handle = text(input.handle);
  if (/^(?:https?:\/\/|www\.)/i.test(handle)) return handle;
  if (!/^@?[A-Za-z0-9_][A-Za-z0-9_.-]{1,80}$/.test(handle)) return '';
  const roots = { twitch: 'https://twitch.tv/', kick: 'https://kick.com/',
    youtube: 'https://youtube.com/@', instagram: 'https://instagram.com/', tiktok: 'https://tiktok.com/@' };
  const root = roots[text(input.platform).toLowerCase()];
  return root ? root + handle.replace(/^@/, '') : '';
}
export function profileDetails(profile = {}, messages = []) {
  const received = messages.filter((m) => m.actor === 'creator').map((m) => m.text);
  const raw = join(received);
  const declaredMetrics = [];
  for (const [key, label] of [['averageViewers', 'Media espectadores'], ['tiktokAverageViewers', 'Media TikTok LIVE']]) {
    const metric = profile[key];
    if (metric?.value != null) declaredMetrics.push(`${label}: ${metric.value}; periodo ${metric.periodDays ?? 'no indicado'} días; declarado`);
  }
  if (profile.instagramMetrics) declaredMetrics.push(`Instagram (declarado): ${JSON.stringify(profile.instagramMetrics)}`);
  const lines = raw.split('\n');
  const metrics = join([...declaredMetrics, ...lines.filter((s) => /\d/.test(s) && /stats|estad[ií]st|view|visita|visualiza|espectador|seguido|alcance|reel|historia|30 d[ií]as/i.test(s))]);
  const geo = join(lines.filter((s) => /\d/.test(s) && /GEO|audiencia|Espa[nñ]a|M[eé]xico|Argentina|Brasil|Portugal|pa[ií]s/i.test(s)));
  const attachments = join(lines.filter((s) => /\[Adjunto recibido/.test(s)));
  return { raw, metrics, geo, attachments };
}
export function toContact(input) {
  const p = input.profile ?? {};
  const details = profileDetails(p, [...(input.messages ?? []), ...(input.message ? [{ actor: 'creator', text: input.message }] : [])]);
  const context = join([input.message, details.raw,
    input.handle ? `Canal declarado: ${text(input.handle)}` : '',
    input.otherLinks ? `Otras redes compartidas: ${text(input.otherLinks)}` : '']);
  const socials = networks(join([declaredChannel(input), input.otherLinks, context, ...(p.socials ?? []).map((s) => s.url)]));
  const content = text(input.content);
  const mention = [...new Set((context.match(/\b(?:CS2|CSGO|Valorant|Minecraft|Fortnite|League of Legends|GTA|Warzone)\b/gi) ?? []).map((s) => s.toUpperCase()))];
  return {
    ids: [input.id], createdAt: new Date(input.createdAt).toISOString(),
    updatedAt: new Date(input.updatedAt ?? input.createdAt).toISOString(),
    name: text(input.name || p.name) || (socials[0] ? new URL(socials[0].url).pathname.replace(/^\/@?/, '') : 'Contacto WhatsApp · por revisar'),
    email: text(input.email || p.email).toLowerCase(), country: text(input.country || p.country),
    content: content || (mention.length ? `Menciona: ${mention.join(', ')}` : ''),
    platform: text(input.platform || p.streamPlatform) || join(socials.map((s) => s.platform)),
    socials, followers: text(input.followers), average: text(input.average ?? p.averageViewers?.value),
    origin: input.origin, phone: text(input.phone), metrics: details.metrics,
    geo: details.geo, attachments: details.attachments, context, crm: input.crm,
    status: text(input.status).toLowerCase(),
  };
}
export function combineContacts(inputs) {
  const result = [];
  for (const item of inputs) {
    // Exact email/phone identities only; never merge by name or guessed handle.
    const prior = result.find((r) => (item.email && r.email === item.email) || (item.phone && r.phone === item.phone));
    if (!prior) { result.push(structuredClone(item)); continue; }
    prior.ids = [...new Set([...prior.ids, ...item.ids])];
    prior.socials = [...new Map([...prior.socials, ...item.socials].map((s) => [s.url.toLowerCase(), s])).values()];
    for (const key of ['name', 'content', 'platform', 'followers', 'average', 'origin', 'metrics', 'geo', 'attachments', 'context', 'crm']) prior[key] = join([prior[key], item[key]]);
    const statusPriority = { '': 0, nuevo: 1, descartado: 2, contactado: 3, ganado: 4, interesante: 5 };
    if ((statusPriority[item.status] ?? 0) > (statusPriority[prior.status] ?? 0)) prior.status = item.status;
    for (const key of ['email', 'phone', 'country']) if (!prior[key]) prior[key] = item[key];
    if (item.updatedAt > prior.updatedAt) prior.updatedAt = item.updatedAt;
    if (item.createdAt < prior.createdAt) prior.createdAt = item.createdAt;
  }
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function contactCells(item) {
  const platform = (name) => join(item.socials.filter((s) => s.platform === name).map((s) => s.url));
  const hash = createHash('sha256').update(JSON.stringify(item)).digest('hex');
  const status = { interesante: 'Interesante', contactado: 'Contactado', descartado: 'Descartado', ganado: 'Contactado' }[item.status] ?? 'Nuevo';
  return [item.ids[0], item.createdAt, item.name, item.email, item.country, item.content,
    item.platform, platform('YouTube'), platform('Twitch'), platform('Kick'),
    join(item.socials.filter((s) => !['YouTube','Twitch','Kick'].includes(s.platform)).map((s) => s.url)),
    item.followers, '', item.average, '', status, '', '', item.origin, item.phone,
    platform('Instagram'), platform('TikTok'), item.metrics, item.geo, item.attachments,
    item.context.slice(0, 45000), item.updatedAt, item.crm, item.ids.join('\n'), hash];
}
