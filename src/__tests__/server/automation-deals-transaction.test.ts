import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE_PATH = resolve(process.cwd(), 'src/lib/queries/automationDeals.ts');
const SOURCE = readFileSync(SOURCE_PATH, 'utf8');

describe('createAutomatedDeal — transacción compatible con Neon', () => {
  it('usa el driver WebSocket para la transacción interactiva', () => {
    const start = SOURCE.indexOf('export async function createAutomatedDeal');
    const end = SOURCE.indexOf('export async function getAutomatedDealProgress');
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);

    const body = SOURCE.slice(start, end);
    expect(body).toMatch(/getTransactionalDb\(\)\.transaction\s*\(/);
    expect(body).not.toMatch(/\bdb\.transaction\s*\(/);
  });
});
