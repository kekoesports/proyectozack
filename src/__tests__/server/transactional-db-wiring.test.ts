import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('transaction-capable database wiring', () => {
  it('creates the WebSocket pool lazily so read-only imports can exit cleanly', () => {
    const contents = source('src/lib/db.ts');
    expect(contents).toContain('function createTransactionalDatabase()');
    expect(contents).toContain('transactionalDatabase ??= createTransactionalDatabase()');
    expect(contents).toContain('allowExitOnIdle: true');
  });

  it.each([
    'src/lib/queries/invoicePayments.ts',
    'src/lib/queries/bankReconciliation.ts',
    'src/lib/queries/campaigns.ts',
    'src/lib/queries/deliverables.ts',
    'src/app/admin/(dashboard)/talents/[id]/files/actions.ts',
  ])('%s uses transactionalDb for interactive transactions', (path) => {
    const contents = source(path);
    expect(contents).toContain('transactionalDb');
    expect(contents).not.toMatch(/(?<!transactional)db\.transaction\s*\(/);
  });

  it('campaign mutations enqueue durable lifecycle events', () => {
    const contents = source('src/lib/queries/campaigns.ts');
    expect(contents).toContain("eventType: 'campaign.created'");
    expect(contents).toContain("eventType: 'campaign.updated'");
    expect(contents).toContain("eventType: 'campaign.approved'");
  });

  it('deliverable mutations enqueue durable lifecycle events', () => {
    const contents = source('src/lib/queries/deliverables.ts');
    expect(contents).toContain("eventType: 'deliverable.created'");
    expect(contents).toContain("eventType: 'deliverable.status_changed'");
  });
});
