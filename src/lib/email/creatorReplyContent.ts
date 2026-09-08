import type { CreatorOutreachStatus } from '@/lib/schemas/creator-outreach';

const OPT_OUT = /\b(?:unsubscribe|stop|remove me|darme de baja|no me escrib|no contactar|borradme)\b/i;
const NOT_INTERESTED = /\b(?:not interested|no (?:me|nos) interesa|no gracias|declin|rechaz|ahora no)\b/i;
const INTERESTED = /\b(?:interesad[oa]s?|me interesa|nos interesa|suena bien|hablemos|agendemos|let'?s talk|interested)\b/i;
const NEEDS_INFO = /\?|\b(?:precio|presupuesto|condiciones|detalles|propuesta|informaci[oó]n|tarifa|rates?|budget|details?)\b/i;

export function normalizeEmail(value: string): string | null {
  const candidate = value.match(/<([^<>]+)>/)?.[1] ?? value;
  const normalized = candidate.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && normalized.length <= 254
    ? normalized
    : null;
}

export function receivedText(text: string | null | undefined, html: string | null | undefined): string {
  const raw = text?.trim() || htmlToText(html ?? '');
  return raw.slice(0, 20_000).trim() || '[Mensaje sin cuerpo de texto]';
}

export function summarizeReply(body: string): string {
  const unquoted = body
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('>'))
    .join(' ')
    .split(/\b(?:On .+ wrote:|El .+ escribi[oó]:)\b/i)[0] ?? body;
  return unquoted.replace(/\s+/g, ' ').trim().slice(0, 500) || 'Respuesta recibida';
}

export function classifyReply(body: string): CreatorOutreachStatus {
  if (OPT_OUT.test(body)) return 'unsubscribed';
  if (NOT_INTERESTED.test(body)) return 'not_interested';
  if (INTERESTED.test(body)) return 'interested';
  if (NEEDS_INFO.test(body)) return 'needs_info';
  return 'replied';
}

export function suggestedReplyFor(status: CreatorOutreachStatus): string | null {
  if (status === 'interested') {
    return 'Gracias por responder. Nos alegra que te interese. ¿Te viene bien que concretemos objetivos, formato y fechas por aquí?';
  }
  if (status === 'needs_info') {
    return 'Gracias por responder. Te preparo los detalles para que puedas valorarlo con toda la información. ¿Hay algún punto concreto que quieras que priorice?';
  }
  if (status === 'replied') {
    return 'Gracias por responder. Hemos registrado tu mensaje y te contestaremos con el siguiente paso concreto.';
  }
  return null;
}

function htmlToText(value: string): string {
  return value
    .replace(/<(?:br|\/p|\/div|\/li)>/gi, '\n')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
