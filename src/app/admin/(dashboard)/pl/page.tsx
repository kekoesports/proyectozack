import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmBrands, talents } from '@/db/schema';
import { requireAnyRole } from '@/lib/auth-guard';
import { getPnL } from '@/lib/queries/pnl';
import { PnLOverviewCards } from '@/components/admin/pnl/PnLOverviewCards';
import { PnLBreakdownTable } from '@/components/admin/pnl/PnLBreakdownTable';
import { PnLCategoryList } from '@/components/admin/pnl/PnLCategoryList';
import { PnLFilters } from '@/components/admin/pnl/PnLFilters';

import type { InvoiceCompany } from '@/types';
import type { PnLFilters as PnLFiltersType } from '@/lib/queries/pnl';

export const metadata: Metadata = { title: 'P&L | Admin' };

const VALID_COMPANIES: readonly string[] = [
  'spain',
  'andorra',
  'argentina',
  'spain_andorra',
  'spain_argentina',
];

function parseSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

type PageProps = {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PnLPage({ searchParams }: PageProps): Promise<ReactElement> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const sp = (await searchParams) ?? {};
  const fallback = defaultRange();
  const company = parseSearchParam(sp.company);
  const from = parseSearchParam(sp.from) || fallback.from;
  const to = parseSearchParam(sp.to) || fallback.to;
  const brandIdRaw = parseSearchParam(sp.brandId);
  const talentIdRaw = parseSearchParam(sp.talentId);

  const filters: PnLFiltersType = {
    from,
    to,
    ...(VALID_COMPANIES.includes(company) ? { company: company as InvoiceCompany } : {}),
    ...(brandIdRaw && /^\d+$/.test(brandIdRaw) ? { brandId: Number(brandIdRaw) } : {}),
    ...(talentIdRaw && /^\d+$/.test(talentIdRaw) ? { talentId: Number(talentIdRaw) } : {}),
  };

  const [pnl, brandList, talentList, totalsBefore] = await Promise.all([
    getPnL(filters),
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
    db.execute(sql`select 1`).then(() => null), // placeholder to keep parallel structure
  ]);
  void totalsBefore;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">P&amp;L</h1>
          <p className="text-sm text-sp-admin-muted">Resumen financiero por empresa, en EUR</p>
        </div>
      </div>

      <PnLFilters
        company={company}
        from={from}
        to={to}
        brandId={brandIdRaw}
        talentId={talentIdRaw}
        brands={brandList}
        talents={talentList}
      />

      <PnLOverviewCards pnl={pnl} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PnLBreakdownTable breakdown={pnl.breakdownByMonth} />
        </div>
        <PnLCategoryList breakdown={pnl.breakdownByCategory} />
      </div>
    </div>
  );
}
