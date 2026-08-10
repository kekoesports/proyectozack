/**
 * Regression locks — CRM admin QA sprint 4 (minor residuals).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

describe('sprint4 — F-BLOB', () => {
  it('receipt proxy route exists', () => {
    const src = read('src/app/api/admin/facturacion/[id]/receipt/route.ts');
    expect(src).toMatch(/receiptFileUrl/);
    expect(src).toMatch(/streamPrivateBlob|BLOB_READ_WRITE_TOKEN/);
  });

  it('UI receipt hrefs use proxy', () => {
    expect(read('src/features/admin/invoices/components/BillingMovementModal.tsx')).toMatch(
      /\/api\/admin\/facturacion\/\$\{invoice\.id\}\/receipt/,
    );
    expect(read('src/features/admin/campaigns/components/CampaignPayments.tsx')).toMatch(
      /\/api\/admin\/facturacion\/\$\{inv\.id\}\/receipt/,
    );
  });

  it('list DTOs redact private blob URLs', () => {
    expect(read('src/lib/queries/invoices.ts')).toMatch(/redactPrivateUrls|__has__/);
    expect(read('src/lib/queries/issuedInvoices.ts')).toMatch(
      /pdfUrl: r\.pdfUrl \? `\/api\/admin\/facturacion\/issued/,
    );
    expect(read('src/lib/queries/financeDashboard/gastos.ts')).toMatch(/__has__/);
  });
});

describe('sprint4 — ENTREGABLES staff visibility', () => {
  it('listTrackers accepts session staff filter', () => {
    const src = read('src/lib/queries/deal-trackers.ts');
    expect(src).toMatch(/session\?\.role === 'staff'|opts\?\.session && opts\.session\.role === 'staff'/);
    expect(src).toMatch(/assignedToUserId/);
  });

  it('entregables pages pass staff session', () => {
    expect(read('src/app/admin/(dashboard)/entregables/page.tsx')).toMatch(/staffSession|listVisibleTalentIds/);
    expect(read('src/app/admin/(dashboard)/entregables/[trackerId]/page.tsx')).toMatch(
      /getTrackerWithItems\([\s\S]*staff/,
    );
  });
});

describe('sprint4 — R10 createTalent contacts/verticals', () => {
  it('createTalentAction persists verticals and contacts', () => {
    const src = read('src/app/admin/(dashboard)/talents/actions.ts');
    expect(src).toMatch(/setTalentVerticals/);
    expect(src).toMatch(/upsertTalentBusiness/);
    expect(src).toMatch(/contact_\$\{i \+ 1\}_type|contact_\$\{i\}_type/);
  });
});

describe('sprint4 — R12 del(url)', () => {
  it('contract and invoice deletes use fileUrl not filePath', () => {
    expect(read('src/app/admin/(dashboard)/campanas/contract-actions.ts')).toMatch(
      /del\(existing\.fileUrl\)/,
    );
    expect(read('src/app/admin/(dashboard)/contratos/actions.ts')).toMatch(/del\(contract\.fileUrl\)/);
    expect(read('src/app/admin/(dashboard)/facturacion/invoices-actions.ts')).toMatch(
      /del\(existing\.fileUrl\)/,
    );
  });
});

describe('sprint4 — R13 updateCampaignSchema refine', () => {
  it('update schema has amount and date refines', () => {
    const src = read('src/lib/schemas/campaign.ts');
    expect(src).toMatch(/updateCampaignSchema[\s\S]*amountTalent <= v\.amountBrand/);
    expect(src).toMatch(/updateCampaignSchema[\s\S]*startDate <= v\.endDate/);
  });
});

describe('sprint4 — R14 alerts invoice-based', () => {
  it('pending cobro/pago use invoice EXISTS not status proxy only', () => {
    const src = read('src/lib/queries/alerts.ts');
    expect(src).toMatch(/NOT EXISTS[\s\S]*kind = 'income'[\s\S]*cobrada.*pagada|IN \('cobrada', 'pagada'\)/);
    expect(src).toMatch(/i\.status IN \('cobrada', 'pagada'\)/);
  });
});

describe('sprint4 — R16 P&L nav', () => {
  it('FinanzasNav includes P&L tab', () => {
    expect(read('src/app/admin/(dashboard)/finanzas/FinanzasNav.tsx')).toMatch(
      /href: '\/admin\/finanzas\/pl'/,
    );
  });
});

describe('sprint4 — F-PAY + F-MIRROR', () => {
  it('internal payment uses SUM(invoice_payments)', () => {
    const src = read('src/lib/queries/invoicePayments.ts');
    expect(src).toMatch(/sum\(invoicePayments\.amount\)/);
    expect(src).toMatch(/eq\(invoicePayments\.invoiceId/);
  });

  it('mirror dedupe uses exact concept match', () => {
    const src = read('src/app/admin/(dashboard)/facturacion/issued-invoices-actions.ts');
    expect(src).toMatch(/ISSUED_MIRROR_CONCEPT_PREFIX/);
    expect(src).toMatch(/eq\(invoices\.concept, conceptId\)/);
    expect(src).not.toMatch(/listInvoices\(\{ search:/);
  });
});
