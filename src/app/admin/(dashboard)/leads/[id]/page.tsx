import { notFound } from 'next/navigation';

import { requirePermission, hasPermission } from '@/lib/permissions';
import { getLeadById } from '@/lib/queries/leads';
import { getAllStaffUsers } from '@/lib/queries/staffUsers';
import { LeadDetail } from '@/features/admin/leads/components/LeadDetail';

export const metadata = { title: 'Lead | Admin' };

type Props = { readonly params: Promise<{ id: string }> };

export default async function AdminLeadDetailPage({ params }: Props): Promise<React.ReactElement> {
  const session = await requirePermission('leads', 'read');
  const canWrite = hasPermission(session.user.role, 'leads', 'write');

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const [lead, staff] = await Promise.all([getLeadById(numId), getAllStaffUsers()]);
  if (!lead) notFound();

  return (
    <LeadDetail
      lead={lead}
      staff={staff.map((s) => ({ id: s.id, name: s.name }))}
      canWrite={canWrite}
    />
  );
}
