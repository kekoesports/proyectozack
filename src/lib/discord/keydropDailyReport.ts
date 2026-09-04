import type { KeydropDailyCreatorReport } from '@/lib/queries/keydropDailyReport';

// Discord limits a webhook message to 6,000 characters across all embeds.
// Three compact creator embeds leave enough margin for titles and footers.
const CREATORS_PER_MESSAGE = 3;
const GIVEAWAYS_PER_CREATOR = 12;
const DESCRIPTION_LIMIT = 1_500;
const DISCORD_TIMEOUT_MS = 8_000;
const KEYDROP_COLOR = 0xe03070;

interface DiscordEmbed {
  readonly title: string;
  readonly url: string;
  readonly description: string;
  readonly color: number;
  readonly footer: { readonly text: string };
  readonly timestamp: string;
}

export interface DiscordWebhookPayload {
  readonly username: string;
  readonly content: string;
  readonly allowed_mentions: { readonly parse: readonly string[] };
  readonly embeds: readonly DiscordEmbed[];
}

export function buildKeydropDiscordPayloads(
  reports: readonly KeydropDailyCreatorReport[],
  generatedAt: Date,
): DiscordWebhookPayload[] {
  if (reports.length === 0) {
    return [{
      username: 'SocialPro · KeyDrop',
      content: '📊 **Informe diario KeyDrop**\nNo hay creadores KeyDrop configurados.',
      allowed_mentions: { parse: [] },
      embeds: [],
    }];
  }

  const chunks = chunk(reports, CREATORS_PER_MESSAGE);
  return chunks.map((batch, index) => ({
    username: 'SocialPro · KeyDrop',
    content: chunks.length === 1
      ? '📊 **Informe diario de sorteos KeyDrop**'
      : `📊 **Informe diario de sorteos KeyDrop** · ${index + 1}/${chunks.length}`,
    allowed_mentions: { parse: [] },
    embeds: batch.map((report) => buildCreatorEmbed(report, generatedAt)),
  }));
}

export async function sendKeydropDiscordReport(
  webhookUrl: string,
  reports: readonly KeydropDailyCreatorReport[],
  generatedAt: Date = new Date(),
): Promise<{ readonly ok: true; readonly messagesSent: number } | { readonly ok: false; readonly status?: number }> {
  const payloads = buildKeydropDiscordPayloads(reports, generatedAt);

  for (const payload of payloads) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DISCORD_TIMEOUT_MS);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) return { ok: false, status: response.status };
    } catch {
      return { ok: false };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { ok: true, messagesSent: payloads.length };
}

function buildCreatorEmbed(report: KeydropDailyCreatorReport, generatedAt: Date): DiscordEmbed {
  const visibleGiveaways = report.giveaways.slice(0, GIVEAWAYS_PER_CREATOR);
  const description = report.status !== 'ok'
    ? statusDescription(report.status)
    : report.activeGiveawayCount === 0
      ? 'Sin sorteos activos hoy.'
      : buildGiveawayDescription(report, visibleGiveaways);

  return {
    title: `${escapeDiscord(report.displayName)} · ${report.activeGiveawayCount} sorteos activos`,
    url: report.profileUrl,
    description,
    color: KEYDROP_COLOR,
    footer: {
      text: report.status === 'ok'
        ? `${report.accumulatedParticipants.toLocaleString('es-ES')} participaciones acumuladas · no son usuarios únicos`
        : 'La cifra no está disponible hasta recuperar la conexión con KeyDrop',
    },
    timestamp: generatedAt.toISOString(),
  };
}

function buildGiveawayDescription(
  report: KeydropDailyCreatorReport,
  giveaways: KeydropDailyCreatorReport['giveaways'],
): string {
  const lines: string[] = [];
  let renderedCount = 0;

  for (const giveaway of giveaways) {
    const label = giveaway.depositRequired > 0 ? 'depositantes' : 'participantes';
    const line = `• [${escapeDiscord(giveaway.title, 90)}](${giveaway.externalUrl}) — **${giveaway.participantCount.toLocaleString('es-ES')} ${label}**`;
    const omittedAfterLine = report.giveaways.length - renderedCount - 1;
    const suffix = omittedAfterLine > 0 ? `\n• …y ${omittedAfterLine} sorteos más en el perfil.` : '';
    const candidate = [...lines, line].join('\n') + suffix;
    if (candidate.length > DESCRIPTION_LIMIT) break;
    lines.push(line);
    renderedCount += 1;
  }

  const omitted = report.giveaways.length - renderedCount;
  if (omitted > 0) lines.push(`• …y ${omitted} sorteos más en el perfil.`);
  return lines.join('\n');
}

function statusDescription(status: KeydropDailyCreatorReport['status']): string {
  if (status === 'not_configured') return 'API key de este creador pendiente de configurar.';
  if (status === 'no_binding') return 'Creador sin binding de KeyDrop.';
  return 'KeyDrop no ha respondido correctamente en esta ejecución.';
}

function escapeDiscord(value: string, maxLength = 180): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('*', '\\*')
    .replaceAll('_', '\\_')
    .replaceAll('`', '\\`')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replaceAll('@', '@\u200b')
    .slice(0, maxLength);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
