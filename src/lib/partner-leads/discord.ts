import type { PartnerLeadDiscordSnapshot } from '@/db/schema';

const DISCORD_MESSAGE_LIMIT = 1_900;

type PartnerLeadDigestInput = {
  readonly researchedAt: Date;
  readonly reportSummary: string;
  readonly candidates: readonly PartnerLeadDiscordSnapshot[];
  readonly newLeadCount: number;
  readonly updatedLeadCount: number;
  readonly discardedCount: number;
  readonly crmUrl: string;
};

function escapeDiscordText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replace(/([*_~`|>])/g, '\\$1')
    .replaceAll('@', '@\u200b');
}

function oneLine(value: string, maxLength: number): string {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  return collapsed.length <= maxLength ? collapsed : `${collapsed.slice(0, maxLength - 1)}…`;
}

function riskIcon(risk: PartnerLeadDiscordSnapshot['riskLevel']): string {
  if (risk === 'green') return '🟢';
  if (risk === 'amber') return '🟠';
  return '🔴';
}

export function formatPartnerLeadDigest(input: PartnerLeadDigestInput): string {
  const date = input.researchedAt.toISOString().slice(0, 10);
  const lines = [
    '## 🎯 Radar diario · partners CS2',
    `**${date}** · ${input.newLeadCount} nuevos · ${input.updatedLeadCount} revisados · ${input.discardedCount} descartes`,
  ];
  const footer = [
    `**Resumen:** ${escapeDiscordText(oneLine(input.reportSummary, 360))}`,
    `[Abrir leads y evidencias en el CRM](${input.crmUrl})`,
    '_El semáforo es diligencia preliminar; cualquier campaña requiere validación legal y contractual._',
  ];

  if (input.candidates.length === 0) {
    lines.push('Hoy no se han encontrado candidatos nuevos con evidencia suficiente.');
  } else {
    for (const [index, candidate] of input.candidates.entries()) {
      const name = escapeDiscordText(oneLine(candidate.name, 70));
      const fit = escapeDiscordText(oneLine(candidate.creatorFit, 150));
      const disposition = candidate.recommendation === 'discard' ? ' · **DESCARTAR**' : '';
      const website = new URL(candidate.url).origin;
      const candidateLine = `${riskIcon(candidate.riskLevel)} **[${name}](${website})** · ${candidate.confidence}%${disposition}\n${fit}`;
      const remaining = input.candidates.length - index;
      const overflowLine = `…y ${remaining} candidatos más en el CRM.`;
      if ([...lines, candidateLine, ...footer].join('\n').length > DISCORD_MESSAGE_LIMIT) {
        lines.push(overflowLine);
        break;
      }
      lines.push(candidateLine);
    }
  }

  return [...lines, ...footer].join('\n');
}
