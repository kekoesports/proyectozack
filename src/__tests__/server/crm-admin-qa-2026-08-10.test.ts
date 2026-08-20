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

// FV.1 movió el criterio de espejo a `src/lib/finance/revenue`: la FK
// `mirror_of_issued_invoice_id` con el prefijo de texto como fallback histórico.
// Estas comprobaciones siguen protegiendo lo mismo (que el espejo no duplique la
// venta) contra el mecanismo actual, y añaden lo que faltaba: que los
// agregadores lean de verdad las facturas emitidas.
describe('QA 2026-08-10 — P&L excludes issued mirrors (R01 complete)', () => {
  it('getFinancePnL skips mirrors and reads issued invoices', () => {
    const src = read('src/lib/queries/financeDashboard/pnlDetail.ts');
    expect(src).toMatch(/isMirrorByFkOrPrefix/);
    expect(src).toMatch(/from\(issuedInvoices\)/);
  });

  it('getPnL skips mirrors', () => {
    const src = read('src/lib/queries/pnl.ts');
    expect(src).toMatch(/isMirrorByFkOrPrefix/);
  });

  it('getBillingKPIs excludes mirrors and adds issued invoices', () => {
    const src = read('src/lib/queries/invoices.ts');
    expect(src).toMatch(/NOT_ISSUED_MIRROR/);
    expect(src).toMatch(/getBillingKPIs[\s\S]*NOT_ISSUED_MIRROR/);
    expect(src).toMatch(/getBillingKPIs[\s\S]*from\(issuedInvoices\)/);
  });
});
