import { requirePermission } from '@/lib/permissions';
import { IngresosCompoundPage } from '@/features/admin/invoices/pages/IngresosCompoundPage';

export const metadata = { title: 'Ingresos · Finanzas' };

// Guard duplicado y explícito (además del que hace IngresosCompoundPage al inicio).
// Documenta a nivel de ruta el requisito y evita depender de la implementación
// interna del compound.
export default async function FinanzasIngresosPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');
  return <IngresosCompoundPage headerTitle="Ingresos" headerSubtitle="Movimientos, facturas emitidas, clientes y empresas emisoras" />;
}
