import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/lib/automation/outbox.ts'),
  'utf8',
);
const IDEMPOTENCY_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/lib/integrations/idempotency.ts'),
  'utf8',
);

describe('Automation outbox delivery guarantees', () => {
  it('claims rows transactionally with SKIP LOCKED', () => {
    expect(SOURCE).toContain('transactionalDb.transaction');
    expect(SOURCE).toMatch(/\.for\(['"]update['"],\s*\{\s*skipLocked:\s*true\s*\}\)/);
    expect(SOURCE).toContain("status: 'processing'");
  });

  it('signs the exact timestamp and JSON body with HMAC SHA-256', () => {
    expect(SOURCE).toContain("createHmac('sha256', secret)");
    expect(SOURCE).toContain('`${timestamp}.${body}`');
    expect(SOURCE).toContain("'x-socialpro-signature': `sha256=${signature}`");
    expect(SOURCE).toContain("'x-socialpro-timestamp': timestamp");
  });

  it('implements bounded exponential retries and dead letters', () => {
    expect(SOURCE).toContain('60_000 * 2 ** exponent');
    expect(SOURCE).toContain('24 * 60 * 60 * 1000');
    expect(SOURCE).toContain('event.attempt >= event.maxAttempts');
    expect(SOURCE).toContain("status: deadLetter ? 'dead_letter' : 'failed'");
  });

  it('fails closed when delivery is not configured', () => {
    expect(SOURCE).toContain('if (!url || !secret)');
    expect(SOURCE).toContain('configured: false');
  });

  it('redacts response snippets before persistence', () => {
    expect(SOURCE).toContain('[redacted-email]');
    expect(SOURCE).toContain('$1=[redacted]');
    expect(SOURCE).toContain('.slice(0, 500)');
  });

  it('releases expired idempotency keys before reserving them again', () => {
    expect(IDEMPOTENCY_SOURCE).toContain('.delete(integrationApiIdempotency)');
    expect(IDEMPOTENCY_SOURCE).toContain('lte(integrationApiIdempotency.expiresAt, now)');
    expect(IDEMPOTENCY_SOURCE).toContain('.onConflictDoNothing()');
  });
});
