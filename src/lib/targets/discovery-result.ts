import type { CreatorDiscoveryPlatformResult } from '@/db/schema/creatorDiscoveryRuns';

/** Count only successful operations; a skipped/failed row's zero is not an observed audience. */
export function sumDiscoveryResults(
  rows: readonly CreatorDiscoveryPlatformResult[],
  key: 'found' | 'qualified' | 'inserted' | 'updated',
): number {
  return rows.reduce((total, row) => total + row[key], 0);
}

export function creatorDiscoveryStatus(
  rows: readonly CreatorDiscoveryPlatformResult[],
): 'success' | 'partial' | 'failed' {
  if (!rows.length) return 'failed';
  const states = rows.map(row => row.status ?? (row.error ? 'failed' : 'success'));
  if (states.every(status => status === 'success')) return 'success';
  if (states.every(status => status === 'failed' || status === 'skipped')) return 'failed';
  return 'partial';
}
