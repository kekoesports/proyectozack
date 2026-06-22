import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getGeneratedContract } from '@/lib/queries/generatedContracts';
import { ContratoDetailPanel } from '@/features/admin/contratos/components/ContratoDetailPanel';

export const metadata = { title: 'Contrato | Admin' };

type Props = { params: Promise<{ id: string }> };

export default async function ContratoDetailPage({ params }: Props): Promise<React.ReactElement> {
  await requirePermission('contratos', 'read');
  const { id } = await params;
  const numId  = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const contract = await getGeneratedContract(numId);
  if (!contract) notFound();

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link href="/admin/contratos" className="text-[11px] text-sp-admin-muted hover:text-sp-admin-accent transition-colors">
          ← Contratos
        </Link>
      </div>
      <ContratoDetailPanel contract={contract} />
    </div>
  );
}
