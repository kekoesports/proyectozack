import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

describe('tracker reconciliation — no auto-link', () => {
  it('client starts with empty campaign selection', () => {
    const src = read('src/features/admin/trackers/components/TrackerReconciliationClient.tsx');
    expect(src).toMatch(/useState\(''\)/);
    expect(src).toMatch(/disabled=\{pending \|\| !campaignId\}/);
    expect(src).not.toMatch(/setCampaignId\(String\(row\.candidates/);
  });

  it('link action requires an explicit campaignId via Zod', () => {
    const src = read('src/app/admin/(dashboard)/entregables/reconciliation-actions.ts');
    expect(src).toMatch(/linkTrackerToCampaignSchema\.safeParse/);
    expect(src).toMatch(/requirePermission\('campanas', 'write'\)/);
    expect(src).not.toMatch(/candidates\[0\]/);
  });

  it('queue page passes staff session', () => {
    expect(read('src/app/admin/(dashboard)/entregables/reconciliar/page.tsx')).toMatch(
      /staffSession|session\.user\.role === 'staff'/,
    );
  });

  it('always offers a campaign select, not only matcher radios', () => {
    const src = read('src/features/admin/trackers/components/TrackerReconciliationClient.tsx');
    expect(src).toMatch(/Selecciona una campaña/);
    expect(src).toMatch(/campaigns=\{campaigns\}/);
  });

  it('link/classify require a returning row', () => {
    const src = read('src/lib/queries/tracker-reconciliation.ts');
    expect(src).toMatch(/\.returning\(\{ id: dealDeliverableTrackers\.id \}\)/);
    expect(src).toMatch(/updated\.length === 0/);
  });

  it('keeps the full unique index — not a partial is_active unique', () => {
    const schema = read('src/db/schema/dealDeliverableTrackers.ts');
    expect(schema).toMatch(/uniqueIndex\('deal_items_tracker_url_uidx'\)\.on\(t\.trackerId, t\.normalizedUrl\)/);
    expect(schema).not.toMatch(/deal_items_tracker_url_uidx'\)[\s\S]*is_active/);
  });
});
