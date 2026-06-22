import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { listContractTemplates } from '@/lib/queries/contractTemplates';
import { db } from '@/lib/db';
import { talents } from '@/db/schema/talents';
import { crmBrands } from '@/db/schema/crmBrands';
import { asc } from 'drizzle-orm';
import { NuevoContratoForm } from '@/features/admin/contratos/components/NuevoContratoForm';

export const metadata = { title: 'Nuevo contrato | Admin' };

export default async function NuevoContratoPage(): Promise<React.ReactElement> {
  await requirePermission('contratos', 'write');

  const [templates, talentRows, brandRows] = await Promise.all([
    listContractTemplates(),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
  ]);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-2">
        <Link href="/admin/contratos" className="text-[11px] text-sp-admin-muted hover:text-sp-admin-accent transition-colors">
          ← Contratos
        </Link>
      </div>
      <h1 className="text-xl font-bold text-sp-admin-text leading-none">Nuevo contrato</h1>

      <NuevoContratoForm
        templates={templates}
        talents={talentRows}
        brands={brandRows}
      />
    </div>
  );
}
