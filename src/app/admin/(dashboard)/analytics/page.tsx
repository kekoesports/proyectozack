import { requireAnyRole } from '@/lib/auth-guard';
import { listCampaigns } from '@/lib/queries/campaigns';
import { listInvoices } from '@/lib/queries/invoices';
import { AnalyticsDashboard } from '@/features/admin/analytics/components/AnalyticsDashboard';
import type { CampaignWithRelations } from '@/types';

export const metadata = { title: 'Analítica | Admin' };

export default async function AdminAnalyticsPage(): Promise<React.ReactElement> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');
  const isStaff = session.user.role === 'staff';

  const [rawCampaigns, invoices] = await Promise.all([
    listCampaigns(isStaff ? { filters: { responsibleUserId: session.user.id } } : undefined),
    listInvoices(),
  ]);

  // listCampaigns returns CampaignRow[]; add derived defaults for the analytics dashboard.
  // Real payment status is derived from invoices in the dashboard when available.
  const campaigns: CampaignWithRelations[] = rawCampaigns.map((c) => ({
    ...c,
    brandName: null,
    talentName: null,
    ownerName: null,
    brandPaid: 'no' as const,
    talentPaid: 'no' as const,
    totalInvoicedBrand: 0,
    totalPaidTalent: 0,
    commissionAmount: Number(c.amountBrand ?? 0) - Number(c.amountTalent ?? 0),
    commissionPct: Number(c.amountBrand ?? 0) > 0
      ? ((Number(c.amountBrand ?? 0) - Number(c.amountTalent ?? 0)) / Number(c.amountBrand ?? 0)) * 100
      : 0,
  }));

  return <AnalyticsDashboard campaigns={campaigns} invoices={invoices} />;
}
