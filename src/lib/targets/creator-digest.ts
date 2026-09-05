import type { CreatorDiscoveryPlatformResult } from '@/db/schema/creatorDiscoveryRuns';

function safe(value: string): string { return value.replace(/[@<>`\[\]\\]/g, '').replace(/\s+/g, ' ').slice(0, 110); }
export function formatCreatorDigest(input: {
  runId: number; results: readonly CreatorDiscoveryPlatformResult[]; durationMs: number;
  top?: readonly { name: string; platform: string; score: number | null }[];
}): string {
  const lines = ['**SOCIALPRO — CREATOR DISCOVERY**', `Ejecución #${input.runId} · ${Math.round(input.durationMs / 1000)} s`];
  for (const item of input.results) {
    lines.push(`\n**${item.platform.toUpperCase()}** ${item.status === 'skipped' ? '⏸ No ejecutado' : item.status === 'success' ? '✅' : '⚠️'}`);
    if (item.status !== 'skipped') lines.push(`${item.inserted} nuevos · ${item.updated} actualizados · ${item.found} encontrados · ${item.qualified} superan reglas`);
    if (item.error) lines.push(safe(item.error));
    if (item.warnings?.length) lines.push(item.warnings.slice(0, 3).map(safe).join(' · '));
  }
  if (input.top?.length) lines.push('\n**Candidatos de esta ejecución — revisar**', ...input.top.slice(0, 4).map((item) => `${safe(item.name)} · ${safe(item.platform)} · ${item.score ?? 'sin dato'}/100`));
  const pages = input.results.reduce((sum, item) => sum + (item.usage?.searchPages ?? 0), 0);
  lines.push(`\nPáginas recibidas: ${pages}; no equivale al total de intentos ni a la cuota restante.`,
    'Coste monetario: sin medición del proveedor. Límites diarios internos aplicados.',
    'No se ha contactado a nadie. Descartes y contactos previos se conservan.', 'https://socialpro.es/admin/targets');
  return lines.join('\n').slice(0, 1800);
}
