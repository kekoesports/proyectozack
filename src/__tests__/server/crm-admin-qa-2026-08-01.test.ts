/**
 * Regression locks from CRM /admin QA (5-agent workflow, 2026-08-01).
 * Source-contract tests against shipped paths — no reimplementation.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isSettledInvoiceStatus,
  settledStatusForKind,
  PENDING_INCOME_STATUSES,
  PENDING_EXPENSE_STATUSES,
} from '@/lib/utils/invoice-status';
import {
  assertInvoicePayable,
  PaymentGuardError,
} from '@/lib/services/bank-reconciliation/invoicePaymentGuards';

const ROOT = resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

describe('CRM admin QA 2026-08-01 — page guards', () => {
  it.each([
    ['src/app/admin/(dashboard)/talents/fotos/page.tsx', "requirePermission('talentos'"],
    ['src/app/admin/(dashboard)/equipo/fotos/page.tsx', "requirePermission('equipo'"],
    ['src/app/admin/(dashboard)/facturacion/exports/page.tsx', "requirePermission('facturacion'"],
  ] as const)('%s requires permission', (file, needle) => {
    expect(read(file)).toContain(needle);
  });
});

describe('CRM admin QA 2026-08-01 — brands visibility & IDOR', () => {
  it('brands list only attaches campaigns for visible brand ids', () => {
    const src = read('src/app/admin/(dashboard)/brands/page.tsx');
    expect(src).toMatch(/visibleBrandIds/);
    expect(src).toMatch(/visibleBrandIds\.has\(c\.brandId\)/);
  });

  it('crm-actions resolve contact ownership from DB row', () => {
    const src = read('src/app/admin/(dashboard)/brands/crm-actions.ts');
    expect(src).toMatch(/getBrandContactById/);
    expect(src).toMatch(/getBrandFollowupById/);
    expect(src).toMatch(/existing\.brandId/);
  });

  it('brief-actions assert brand ownership and brief↔brand binding', () => {
    const src = read('src/app/admin/(dashboard)/brands/brief-actions.ts');
    expect(src).toMatch(/assertCanEditBrand/);
    expect(src).toMatch(/assertBriefBelongsToBrand/);
  });
});

describe('CRM admin QA 2026-08-01 — campaigns permissions & filters', () => {
  it('create/update campaign require campanas:write; archive requires delete', () => {
    const src = read('src/app/admin/(dashboard)/campanas/actions.ts');
    expect(src).toMatch(/createCampaignAction[\s\S]*?requirePermission\('campanas', 'write'\)/);
    expect(src).toMatch(/updateCampaignAction[\s\S]*?requirePermission\('campanas', 'write'\)/);
    expect(src).toMatch(/archiveCampaignAction[\s\S]*?requirePermission\('campanas', 'delete'\)/);
  });

  it('list cobro/pago filters use brandPaid/talentPaid not only manual flags', () => {
    const src = read('src/features/admin/campaigns/components/CampaignsList.parts.tsx');
    expect(src).toMatch(/brandPaid === 'si'/);
    expect(src).toMatch(/talentPaid === 'si'/);
  });
});

describe('CRM admin QA 2026-08-01 — invoice settled semantics', () => {
  it.each([
    ['income', 'cobrada'],
    ['expense', 'pagada'],
  ] as const)('settledStatusForKind(%s) → %s', (kind, status) => {
    expect(settledStatusForKind(kind)).toBe(status);
  });

  it('PENDING catalogs include legacy open statuses used by UI', () => {
    expect(PENDING_INCOME_STATUSES).toEqual(
      expect.arrayContaining(['pendiente', 'no_cobrada', 'no_cobrado', 'parcial', 'vencida', 'emitida']),
    );
    expect(PENDING_EXPENSE_STATUSES).toEqual(
      expect.arrayContaining(['pendiente', 'no_pagada', 'no_pagado', 'parcial', 'vencida', 'emitida']),
    );
  });

  it('assertInvoicePayable rejects sibling settled status (income pagada)', () => {
    expect(() =>
      assertInvoicePayable({
        status: 'pagada',
        totalDue: '100.00',
        previouslyPaid: '0',
        amountToApply: '10.00',
        kind: 'internal_income',
      }),
    ).toThrow(PaymentGuardError);
  });

  it('assertInvoicePayable rejects expense marked cobrada as already completed', () => {
    expect(() =>
      assertInvoicePayable({
        status: 'cobrada',
        totalDue: '100.00',
        previouslyPaid: '0',
        amountToApply: '10.00',
        kind: 'internal_expense',
      }),
    ).toThrow(PaymentGuardError);
  });

  it('isSettledInvoiceStatus treats both cobrada and pagada', () => {
    expect(isSettledInvoiceStatus('cobrada')).toBe(true);
    expect(isSettledInvoiceStatus('pagada')).toBe(true);
    expect(isSettledInvoiceStatus('emitida')).toBe(false);
  });
});
