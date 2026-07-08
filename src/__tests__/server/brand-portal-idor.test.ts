/**
 * Sorteos Fase 1 PR2 — blindaje portal marca contra IDOR.
 *
 * Contrato: `getBrandCampaigns(brandUserId)` y `getBrandProposals(brandUserId)`
 * DEBEN filtrar internamente por `brandUserId` recibido, sin confiar en
 * ninguna capa superior. Un cambio futuro que elimine el where clause
 * rompería estos tests.
 *
 * No hay migración ni cambio de código en estas queries — solo estos
 * tests defensivos (no existían antes).
 */

// ── Mocks ────────────────────────────────────────────────────────────────

interface Captured {
  where?: unknown;
  with?: unknown;
  orderBy?: unknown;
}

let capturedCampaigns: Captured | null = null;
let capturedProposals: Captured | null = null;

const brandARows = [{ id: 1, brandUserId: 'brand-A', title: 'campaña A' }];
const brandBRows = [{ id: 2, brandUserId: 'brand-B', title: 'campaña B' }];

const proposalARows = [{ id: 10, brandUserId: 'brand-A', title: 'propuesta A' }];
const proposalBRows = [{ id: 20, brandUserId: 'brand-B', title: 'propuesta B' }];

jest.mock('@/lib/db', () => ({
  db: {
    query: {
      brandCampaigns: {
        findMany: jest.fn((opts: Captured) => {
          capturedCampaigns = opts;
          const w = opts.where as { column?: string; value?: unknown } | undefined;
          if (w && w.column === 'brandUserId') {
            return [...brandARows, ...brandBRows].filter((r) => r.brandUserId === w.value);
          }
          return [...brandARows, ...brandBRows];
        }),
      },
      talentProposals: {
        findMany: jest.fn((opts: Captured) => {
          capturedProposals = opts;
          const w = opts.where as { column?: string; value?: unknown } | undefined;
          if (w && w.column === 'brandUserId') {
            return [...proposalARows, ...proposalBRows].filter((r) => r.brandUserId === w.value);
          }
          return [...proposalARows, ...proposalBRows];
        }),
      },
    },
  },
}));

// Drizzle helpers: eq/and/desc devuelven objetos capturables por el mock.
jest.mock('drizzle-orm', () => ({
  eq: (col: unknown, value: unknown) => {
    const colStr = typeof col === 'string' ? col : (col as { name?: string })?.name ?? 'unknown';
    return { column: colStr, value };
  },
  and: (...args: unknown[]) => ({ and: args }),
  desc: (col: unknown) => ({ desc: col }),
  or: (...args: unknown[]) => ({ or: args }),
}));

jest.mock('@/db/schema', () => ({
  brandCampaigns: { brandUserId: { name: 'brandUserId' }, createdAt: { name: 'createdAt' }, talentId: { name: 'talentId' } },
  talentProposals: { brandUserId: { name: 'brandUserId' }, createdAt: { name: 'createdAt' } },
}));

// ── Imports tras mocks ───────────────────────────────────────────────────

import { getBrandCampaigns, getBrandProposals } from '@/lib/queries/brands';

beforeEach(() => {
  capturedCampaigns = null;
  capturedProposals = null;
});

describe('getBrandCampaigns — IDOR blindaje', () => {
  it('marca A solo ve sus campañas, nunca las de marca B', async () => {
    const result = await getBrandCampaigns('brand-A');
    expect(result).toHaveLength(1);
    expect(result[0]!.brandUserId).toBe('brand-A');
    const bad = result.find((r) => r.brandUserId === 'brand-B');
    expect(bad).toBeUndefined();
  });

  it('marca B solo ve sus campañas, nunca las de marca A', async () => {
    const result = await getBrandCampaigns('brand-B');
    expect(result).toHaveLength(1);
    expect(result[0]!.brandUserId).toBe('brand-B');
    const bad = result.find((r) => r.brandUserId === 'brand-A');
    expect(bad).toBeUndefined();
  });

  it('la query pasa el where clause por brandUserId (contrato)', async () => {
    await getBrandCampaigns('brand-A');
    expect(capturedCampaigns).not.toBeNull();
    const w = capturedCampaigns?.where as { column?: string; value?: unknown };
    expect(w.column).toBe('brandUserId');
    expect(w.value).toBe('brand-A');
  });
});

describe('getBrandProposals — IDOR blindaje', () => {
  it('marca A solo ve sus propuestas, nunca las de marca B', async () => {
    const result = await getBrandProposals('brand-A');
    expect(result).toHaveLength(1);
    expect(result[0]!.brandUserId).toBe('brand-A');
    const bad = result.find((r) => r.brandUserId === 'brand-B');
    expect(bad).toBeUndefined();
  });

  it('marca B solo ve sus propuestas, nunca las de marca A', async () => {
    const result = await getBrandProposals('brand-B');
    expect(result).toHaveLength(1);
    expect(result[0]!.brandUserId).toBe('brand-B');
    const bad = result.find((r) => r.brandUserId === 'brand-A');
    expect(bad).toBeUndefined();
  });

  it('la query pasa el where clause por brandUserId (contrato)', async () => {
    await getBrandProposals('brand-A');
    expect(capturedProposals).not.toBeNull();
    const w = capturedProposals?.where as { column?: string; value?: unknown };
    expect(w.column).toBe('brandUserId');
    expect(w.value).toBe('brand-A');
  });
});

describe('regresión — filtro brandUserId no debe eliminarse', () => {
  it('el código fuente de brands.ts contiene el eq(...brandUserId, brandUserId)', () => {
    // Test estático — bloquea regresión si alguien elimina el filtro.
    const fs = jest.requireActual('fs') as typeof import('fs');
    const path = jest.requireActual('path') as typeof import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/queries/brands.ts'),
      'utf8',
    );
    expect(source).toMatch(/eq\(brandCampaigns\.brandUserId,\s*brandUserId\)/);
    expect(source).toMatch(/eq\(talentProposals\.brandUserId,\s*brandUserId\)/);
  });
});
