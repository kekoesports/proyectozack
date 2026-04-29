import { requireAnyRole } from '@/lib/auth-guard';
import { listCampaigns } from '@/lib/queries/campaigns';
import { listInvoices } from '@/lib/queries/invoices';
import { AnalyticsDashboard } from '@/components/admin/analytics/AnalyticsDashboard';

export const metadata = { title: 'Analítica | Admin' };

export default async function AdminAnalyticsPage(): Promise<React.ReactElement> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');
  const isStaff = session.user.role === 'staff';

  const [campaigns, invoices] = await Promise.all([
    listCampaigns(isStaff ? { responsibleUserId: session.user.id } : undefined),
    listInvoices(),
  ]);

  return <AnalyticsDashboard campaigns={campaigns} invoices={invoices} />;
}
