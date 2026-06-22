import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/permissions';

export const metadata = { title: 'Plantillas de contratos | Admin' };

export default async function ContratosPlantillasPage(): Promise<never> {
  await requirePermission('contratos', 'read');
  // Las plantillas se gestionan desde /admin/campanas/plantillas
  redirect('/admin/campanas/plantillas');
}
