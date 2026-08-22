/** Read-only tracker preflight. Aggregates only — no names, URLs or amounts. */
import { getTrackerReconciliationPreflight } from '../src/lib/queries/tracker-reconciliation-preflight';

async function main(): Promise<void> {
  const stats = await getTrackerReconciliationPreflight();
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : 'preflight failed';
  console.error(message);
  process.exit(1);
});
