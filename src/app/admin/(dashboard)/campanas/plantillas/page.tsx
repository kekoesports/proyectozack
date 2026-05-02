import { requireRole } from '@/lib/auth-guard';
import { listContractTemplates } from '@/lib/queries/contractTemplates';
import { ContractTemplatesManager } from '@/features/admin/campaigns/components/ContractTemplatesManager';

export const metadata = { title: 'Plantillas de contratos | Admin' };

export default async function ContractTemplatesPage(): Promise<React.ReactElement> {
  await requireRole('admin', '/admin/login');
  const templates = await listContractTemplates(true); // incluye inactivas para gestión

  return <ContractTemplatesManager templates={templates} />;
}
