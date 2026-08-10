/**
 * Regression locks — CRM admin QA sprint 3:
 * file ownership, briefs proxy, deal ledger, staff dashboard, OCR mock.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

describe('sprint3 — file proxy ownership', () => {
  it('files proxy asserts entity access for staff', () => {
    const src = read('src/app/api/admin/files/[id]/route.ts');
    expect(src).toMatch(/assertEntityAccess|assertCanEditCampaign|assertCanAccessTalent/);
    expect(src).toMatch(/needsVisibilityFilter/);
    expect(src).toMatch(/relatedId/);
  });
});

describe('sprint3 — R09 brief proxy', () => {
  it('brief PDF proxy route exists with brand ownership', () => {
    const src = read('src/app/api/admin/briefs/[id]/route.ts');
    expect(src).toMatch(/requirePermission\(['"]campanas['"],\s*['"]read['"]\)/);
    expect(src).toMatch(/getBrief/);
    expect(src).toMatch(/getCrmBrandForPermission|needsVisibilityFilter/);
    expect(src).toMatch(/streamPrivateBlob/);
  });

  it('BrandBriefsTab uses proxy not raw sourceFileUrl href', () => {
    const src = read('src/features/admin/brands/components/BrandBriefsTab.tsx');
    expect(src).toMatch(/\/api\/admin\/briefs\/\$\{brief\.id\}/);
    expect(src).not.toMatch(/href=\{brief\.sourceFileUrl\}/);
  });
});

describe('sprint3 — deal ledger', () => {
  it('addDealMovimiento requires ownership + facturacion for settled', () => {
    const src = read('src/app/admin/(dashboard)/campanas/deal-movimiento-action.ts');
    expect(src).toMatch(/assertCanEditCampaign/);
    expect(src).toMatch(/isSettledInvoiceStatus/);
    expect(src).toMatch(/facturacion['"],\s*['"]write/);
  });

  it('createInvoiceFromDeal uses facturacion:write not campanas:delete', () => {
    const src = read('src/app/admin/(dashboard)/campanas/create-invoice-from-deal.ts');
    expect(src).toMatch(/requirePermission\(['"]facturacion['"],\s*['"]write['"]\)/);
    expect(src).not.toMatch(/campanas['"],\s*['"]delete/);
    // Agency-wide finance must not require campaign ownership (blocks finance role).
    expect(src).not.toMatch(/assertCanEditCampaign/);
  });
});

describe('sprint3 — R07 staff dashboard', () => {
  it('dashboard page scopes staff queries', () => {
    const src = read('src/app/admin/(dashboard)/page.tsx');
    expect(src).toMatch(/getDashboardPendingTasks\(weekLabel,\s*6,\s*staffSession\)/);
    expect(src).toMatch(/getDashboardUpcomingFollowups\(8,\s*staffUserId/);
    expect(src).toMatch(/getDashboardActivity\(5,\s*staffUserId/);
    expect(src).toMatch(/getCrmBrandCounts\(staffUserId/);
    expect(src).toMatch(/emptyAdminData|isStaff \? Promise\.resolve\(emptyAdminData\)/);
  });

  it('dashboard queries accept staff scope args', () => {
    const src = read('src/lib/queries/dashboard.ts');
    expect(src).toMatch(/getDashboardPendingTasks[\s\S]*taskVisibilityCondition\(session\)/);
    expect(src).toMatch(/getDashboardUpcomingFollowups[\s\S]*staffUserId/);
    expect(src).toMatch(/skipFinancial/);
  });
});

describe('sprint3 — R15 OCR mock gated', () => {
  it('extractInvoiceAction blocks mock outside ENABLE_INVOICE_OCR_MOCK', () => {
    const src = read('src/app/admin/(dashboard)/facturacion/extract-action.ts');
    expect(src).toMatch(/ENABLE_INVOICE_OCR_MOCK/);
    expect(src).toMatch(/NODE_ENV === 'development'/);
    expect(src).toMatch(/mockEnabled/);
  });
});
