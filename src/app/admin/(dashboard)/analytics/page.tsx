import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmBrands, talents } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { listCampaigns } from '@/lib/queries/campaigns';
import { listInvoices } from '@/lib/queries/invoices';
import { getDashboardAlerts } from '@/lib/queries/alerts';
import { getUsdEurRate } from '@/lib/exchangeRate';
import { getCodeClicksByDay } from '@/lib/queries/codeAnalytics';
import { getGiveawayClicksByDay, getGiveawayHubViewsByDay } from '@/lib/queries/giveawayAnalytics';
import { getTopPostsByViews, getPostViewsByDay } from '@/lib/queries/postAnalytics';
import { AnalyticsDashboard } from '@/features/admin/analytics/components/AnalyticsDashboard';
import type { CampaignWithRelations } from '@/types';

export const metadata = { title: 'Analítica | Admin' };

export default async function AdminAnalyticsPage(): Promise<React.ReactElement> {
  const session = await requirePermission('analytics', 'read');
  const isStaff = session.user.role === 'staff';

  const staffSession = isStaff
    ? { userId: session.user.id, role: session.user.role as 'staff' }
    : undefined;

  const alertsOpts = isStaff
    ? { staffUserId: session.user.id, skipFinancial: true, currentUserId: session.user.id }
    : { currentUserId: session.user.id };

  const [rawCampaigns, invoices, brandsList, talentsList, alertsData, codeClicks, giveawayClicks, giveawayViews, topPosts, postViewsByDay, exchangeRate] = await Promise.all([
    listCampaigns(staffSession ? { session: staffSession } : undefined),
    listInvoices(isStaff ? { staffUserId: session.user.id } : {}),
    isStaff
      ? Promise.resolve([])
      : db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    isStaff
      ? Promise.resolve([])
      : db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
    getDashboardAlerts(alertsOpts),
    getCodeClicksByDay(),
    getGiveawayClicksByDay(),
    getGiveawayHubViewsByDay(),
    getTopPostsByViews('all', 20),
    getPostViewsByDay(30),
    getUsdEurRate(),
  ]);

  const brandMap  = new Map(brandsList.map((b)  => [b.id, b.name]));
  const talentMap = new Map(talentsList.map((t) => [t.id, t.name]));

  const campaigns: CampaignWithRelations[] = rawCampaigns.map((c) => {
    const brand  = Number(c.amountBrand  ?? 0);
    const talent = Number(c.amountTalent ?? 0);
    const comm   = brand - talent;

    const campInvoices  = invoices.filter((i) => i.campaignId === c.id);
    const paidIncome    = campInvoices.filter((i) => i.kind === 'income'  && (i.status === 'cobrada' || i.status === 'pagada'));
    const paidExpense   = campInvoices.filter((i) => i.kind === 'expense' && (i.status === 'cobrada' || i.status === 'pagada'));
    const totalInvoicedBrand = paidIncome.reduce((s, i)  => s + Number(i.totalAmount), 0);
    const totalPaidTalent    = paidExpense.reduce((s, i) => s + Number(i.totalAmount), 0);

    const enriched: CampaignWithRelations = {
      ...c,
      brandName:  brandMap.get(c.brandId)   ?? null,
      talentName: talentMap.get(c.talentId) ?? null,
      ownerName:  null,
      brandPaid:  totalInvoicedBrand === 0 ? 'no' : totalInvoicedBrand >= brand  ? 'si' : 'parcial',
      talentPaid: totalPaidTalent    === 0 ? 'no' : totalPaidTalent    >= talent ? 'si' : 'parcial',
      totalInvoicedBrand,
      totalPaidTalent,
      commissionAmount: comm,
      commissionPct:    brand > 0 ? (comm / brand) * 100 : 0,
    };
    return enriched;
  });

  return (
    <AnalyticsDashboard
      campaigns={campaigns}
      invoices={invoices}
      brands={brandsList}
      talents={talentsList}
      alerts={alertsData.alerts}
      alertSummary={alertsData.summary}
      codeClicks={codeClicks}
      giveawayClicks={giveawayClicks}
      giveawayViews={giveawayViews}
      topPosts={topPosts}
      postViewsByDay={postViewsByDay}
      rate={exchangeRate.rate}
      rateDate={exchangeRate.date}
      rateIsEstimated={exchangeRate.isEstimated}
    />
  );
}
