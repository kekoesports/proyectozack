/**
 * Regression locks for CRM QA critical residuals (2026-08-01 follow-up).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ISSUED_PENDING_STATUSES,
  ISSUED_MIRROR_NOTES_PREFIX,
  ISSUED_MIRROR_CONCEPT_PREFIX,
  isIssuedInvoiceMirror,
} from '@/lib/utils/invoice-status';
import {
  buildInvoicePdfUrl,
  buildIssuedInvoicePdfUrl,
} from '@/lib/queries/financeDashboard/expenseSubgroups';

const ROOT = resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

describe('critical residual R01 — facturado double-count', () => {
  it('detects issued→internal auto-mirrors by notes/concept prefixes', () => {
    expect(
      isIssuedInvoiceMirror(
        `${ISSUED_MIRROR_NOTES_PREFIX} F-2026-001`,
        `${ISSUED_MIRROR_CONCEPT_PREFIX}F-2026-001`,
      ),
    ).toBe(true);
    expect(isIssuedInvoiceMirror(null, 'Ingreso marca Acme')).toBe(false);
  });

  it('sumFacturado and finanzasResumenV2 exclude mirror notes prefix', () => {
    const ingresos = read('src/lib/queries/financeDashboard/ingresos.ts');
    const resumen = read('src/lib/queries/financeDashboard/finanzasResumenV2.ts');
    expect(ingresos).toMatch(/ISSUED_MIRROR_NOTES_PREFIX|notIssuedMirror/);
    expect(resumen).toMatch(/ISSUED_MIRROR_NOTES_PREFIX/);
  });
});

describe('critical residual R02 — P&L cobradoYTD includes issued payments', () => {
  it('getFinancePnL cobradoYTD leftJoins payments without requiring invoiceId', () => {
    const src = read('src/lib/queries/financeDashboard/pnlDetail.ts');
    expect(src).toMatch(/issuedInvoiceId\} IS NOT NULL/);
    expect(src).toMatch(/leftJoin\(invoices/);
  });
});

describe('critical residual R03 — AR includes enviada', () => {
  it('ISSUED_PENDING_STATUSES includes enviada', () => {
    expect([...ISSUED_PENDING_STATUSES]).toEqual(
      expect.arrayContaining(['emitida', 'enviada', 'vencida', 'parcial']),
    );
  });

  it('arAging and finanzasResumenV2 import ISSUED_PENDING_STATUSES', () => {
    expect(read('src/lib/queries/financeDashboard/arAging.ts')).toMatch(
      /ISSUED_PENDING_STATUSES/,
    );
    expect(read('src/lib/queries/financeDashboard/finanzasResumenV2.ts')).toMatch(
      /ISSUED_PENDING_STATUSES/,
    );
  });
});

describe('critical residual R04 — issued PDF auth proxy', () => {
  it('buildIssuedInvoicePdfUrl never returns raw blob URL', () => {
    const url = buildIssuedInvoicePdfUrl({
      id: 9,
      pdfUrl: 'https://blob.vercel-storage.com/private/xxx.pdf',
    });
    expect(url).toBe('/api/admin/facturacion/issued/9/pdf');
    expect(url).not.toMatch(/blob\.vercel-storage/);
  });

  it('buildIssuedInvoicePdfUrl returns null without storage pointer', () => {
    expect(buildIssuedInvoicePdfUrl({ id: 1, pdfUrl: null })).toBeNull();
  });

  it('arAging uses buildIssuedInvoicePdfUrl for issued rows', () => {
    const src = read('src/lib/queries/financeDashboard/arAging.ts');
    expect(src).toMatch(/buildIssuedInvoicePdfUrl/);
  });

  it('issued PDF route exists and requires facturacion:read', () => {
    const src = read('src/app/api/admin/facturacion/issued/[id]/pdf/route.ts');
    expect(src).toMatch(/requirePermission\('facturacion', 'read'\)/);
    expect(src).toMatch(/issuedInvoices/);
  });

  it('internal helper still points at internal proxy', () => {
    expect(
      buildInvoicePdfUrl({ id: 3, invoiceFileId: 1, fileUrl: null }),
    ).toBe('/api/admin/facturacion/3/pdf');
  });
});

describe('high residual shell — search + staff dashboard', () => {
  it('AdminHeader gates GlobalSearch by SEARCH_ROLES', () => {
    const src = read('src/features/admin/_shared/components/AdminHeader.tsx');
    expect(src).toMatch(/SEARCH_ROLES/);
    expect(src).toMatch(/showSearch/);
    expect(src).toMatch(/userRole/);
  });

  it('layout passes userRole into AdminHeader', () => {
    const src = read('src/app/admin/(dashboard)/layout.tsx');
    expect(src).toMatch(/userRole=\{session\.user\.role/);
  });

  it('staff dashboard skips financial KPI queries', () => {
    const src = read('src/app/admin/(dashboard)/page.tsx');
    expect(src).toMatch(/isStaff \? Promise\.resolve\(zeroRevenue\)/);
    expect(src).toMatch(/!isStaff \? \(/);
  });
});

describe('issued money mutations use facturacion:write', () => {
  it('create/update/status/rectify require write or delete (not bare read)', () => {
    const src = read('src/app/admin/(dashboard)/facturacion/issued-invoices-actions.ts');
    expect(src).toMatch(/createIssuedInvoiceAction[\s\S]*?requirePermission\('facturacion', 'write'\)/);
    expect(src).toMatch(/updateInvoiceStatusAction[\s\S]*?requirePermission\('facturacion', 'write'\)/);
    // No remaining mutation gates on facturacion:read in this module.
    expect(src).not.toMatch(/requirePermission\('facturacion', 'read'\)/);
  });
});
