import type { CreatorDiscoveryPlatformResult } from '@/db/schema/creatorDiscoveryRuns';
import { formatCreatorDigest } from '@/lib/targets/creator-digest';

function row(overrides: Partial<CreatorDiscoveryPlatformResult> = {}): CreatorDiscoveryPlatformResult {
  return { platform: 'youtube', status: 'success', found: 0, qualified: 0, inserted: 0, updated: 0,
    error: null, warnings: [], usage: { searchPages: 0, candidateChecks: 0 }, ...overrides };
}

it('distinguishes not run from a genuine zero-result search', () => {
  const skipped = formatCreatorDigest({ runId: 7, durationMs: 0, results: [row({ status: 'skipped' })] });
  expect(skipped).toContain('No ejecutado'); expect(skipped).not.toContain('0 encontrados');
  const completed = formatCreatorDigest({ runId: 8, durationMs: 1000, results: [row()] });
  expect(completed).toContain('0 encontrados'); expect(completed).toContain('✅');
});

it.each(['partial', 'failed'] as const)('does not put a success indicator on a %s search', status => {
  const output = formatCreatorDigest({ runId: 9, durationMs: 1000, results: [row({ status, error: 'Synthetic coverage unavailable' })] });
  expect(output).toContain('⚠️'); expect(output).not.toContain('✅');
  expect(output).toContain('Synthetic coverage unavailable');
});

it('does not present page counts as provider attempts, remaining quota, billed cost or outreach', () => {
  const output = formatCreatorDigest({ runId: 10, durationMs: 42_000, results: [row({ usage: { searchPages: 2, candidateChecks: 3 } })] });
  expect(output).toContain('Páginas recibidas: 2'); expect(output).toContain('no equivale al total de intentos');
  expect(output).toContain('sin medición del proveedor'); expect(output).toContain('No se ha contactado a nadie');
  expect(output).not.toMatch(/0[,.]00\s*€|enviado a creadores/i);
});

it('neutralizes profile-supplied mentions and embedded markdown without adding fetched content', () => {
  const output = formatCreatorDigest({ runId: 11, durationMs: 0, results: [row()],
    top: [{ name: '@everyone <@123456789012345678> [Synthetic](javascript:alert) `name`', platform: 'youtube', score: null }] });
  expect(output).not.toContain('@'); expect(output).not.toContain('<'); expect(output).not.toContain('[');
  expect(output).toContain('sin dato/100'); expect(output).toContain('revisar');
});

it('keeps output within the exact guard message limit', () => {
  const results: CreatorDiscoveryPlatformResult[] = ['youtube', 'twitch', 'kick', 'instagram'].map(platform =>
    row({ error: platform.repeat(100), warnings: ['A'.repeat(300), 'B'.repeat(300), 'C'.repeat(300)] }));
  const output = formatCreatorDigest({ runId: 12, durationMs: 0, results,
    top: Array.from({ length: 8 }, () => ({ name: 'Synthetic '.repeat(100), platform: 'youtube', score: 50 })) });
  expect(output.length).toBeLessThanOrEqual(1800);
});
