import { notFound } from 'next/navigation';

import { DraftDetail } from '@/features/admin/automation-drafts/components/DraftDetail';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getAutomationDealDraftDetail } from '@/lib/queries/automationDealDrafts';

export const metadata = { title: 'Borrador | Admin' };

type Props = { readonly params: Promise<{ id: string }> };

export default async function AdminAutomationDraftDetailPage({
  params,
}: Props): Promise<React.ReactElement> {
  const session = await requirePermission('campanas', 'read');
  const canWrite = hasPermission(session.user.role, 'campanas', 'write');

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const draft = await getAutomationDealDraftDetail(numId);
  if (!draft) notFound();

  return <DraftDetail draft={draft} canWrite={canWrite} />;
}
