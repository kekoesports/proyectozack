import { requirePermission } from '@/lib/permissions';
import { listContractTemplates } from '@/lib/queries/contractTemplates';
import { ContractTemplatesManager } from '@/features/admin/campaigns/components/ContractTemplatesManager';

export const metadata = { title: 'Plantillas de contratos | Admin' };

export default async function ContractTemplatesPage(): Promise<React.ReactElement> {
  await requirePermission('campanas', 'delete');
  const templates = await listContractTemplates(true); // incluye inactivas para gestión

  return <ContractTemplatesManager templates={templates} />;
}
