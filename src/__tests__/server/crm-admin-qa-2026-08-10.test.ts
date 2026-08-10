/**
 * Regression locks for CRM /admin QA pass — 2026-08-10.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

describe('QA 2026-08-10 — page guards (P0)', () => {
  it('talent negocio page requires talentos:read + staff visibility', () => {
    const src = read('src/app/admin/(dashboard)/talents/[id]/negocio/page.tsx');
    expect(src).toMatch(/requirePermission\(['"]talentos['"],\s*['"]read['"]\)/);
    expect(src).toMatch(/assertCanAccessTalent/);
  });

  it('analytics growth report requires analytics:read', () => {
    const src = read('src/app/admin/(dashboard)/analytics/report/[talentSlug]/page.tsx');
    expect(src).toMatch(/requirePermission\(['"]analytics['"],\s*['"]read['"]\)/);
  });
});

describe('QA 2026-08-10 — legacy campaign actions hardened', () => {
  it('legacy create/update/delete use write/delete not read', () => {
    const src = read('src/app/admin/(dashboard)/campanas/campaign-actions.ts');
    expect(src).toMatch(/createCampaignAction[\s\S]*?requirePermission\(['"]campanas['"],\s*['"]write['"]\)/);
    expect(src).toMatch(/updateCampaignAction[\s\S]*?requirePermission\(['"]campanas['"],\s*['"]write['"]\)/);
    expect(src).toMatch(/deleteCampaignAction[\s\S]*?requirePermission\(['"]campanas['"],\s*['"]delete['"]\)/);
    expect(src).toMatch(/assertCanEditCampaign/);
  });

  it('contract mutations require campanas:write + ownership', () => {
    const src = read('src/app/admin/(dashboard)/campanas/contract-actions.ts');
    expect(src).not.toMatch(/uploadContractAction[\s\S]{0,200}requirePermission\(['"]campanas['"],\s*['"]read['"]\)/);
    expect(src).toMatch(/requirePermission\(['"]campanas['"],\s*['"]write['"]\)/);
    expect(src).toMatch(/assertCanEditCampaign/);
  });

  it('campaign file upload/delete require write/delete + ownership', () => {
    const src = read('src/app/admin/(dashboard)/campanas/[id]/files/actions.ts');
    expect(src).toMatch(/uploadCampaignFileAction[\s\S]*?requirePermission\(['"]campanas['"],\s*['"]write['"]\)/);
    expect(src).toMatch(/deleteCampaignFileAction[\s\S]*?requirePermission\(['"]campanas['"],\s*['"]delete['"]\)/);
    expect(src).toMatch(/assertCanEditCampaign/);
    expect(src).toMatch(/listFilesByEntity/);
  });

  it('campaign contract PDF proxy asserts ownership', () => {
    const src = read('src/app/api/admin/campanas/[id]/contract/pdf/route.ts');
    expect(src).toMatch(/assertCanEditCampaign/);
  });
});

describe('QA 2026-08-10 — P&L excludes issued mirrors (R01 complete)', () => {
  it('getFinancePnL skips isIssuedInvoiceMirror', () => {
    const src = read('src/lib/queries/financeDashboard/pnlDetail.ts');
    expect(src).toMatch(/isIssuedInvoiceMirror/);
  });

  it('getPnL skips isIssuedInvoiceMirror', () => {
    const src = read('src/lib/queries/pnl.ts');
    expect(src).toMatch(/isIssuedInvoiceMirror/);
  });

  it('getBillingKPIs excludes mirror notes and concept prefixes', () => {
    const src = read('src/lib/queries/invoices.ts');
    expect(src).toMatch(/ISSUED_MIRROR_NOTES_PREFIX/);
    expect(src).toMatch(/ISSUED_MIRROR_CONCEPT_PREFIX/);
    expect(src).toMatch(/getBillingKPIs[\s\S]*ISSUED_MIRROR/);
  });
});
