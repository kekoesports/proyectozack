import { requirePermission } from '@/lib/permissions';
import { IngresosCompoundPage } from '@/features/admin/invoices/pages/IngresosCompoundPage';

export const metadata = { title: 'Gestor de facturación · Ingresos · Finanzas' };

/**
 * Compound page migrada desde /admin/finanzas/ingresos (PR 2).
 *
 * En PR 3 rediseñamos /ingresos con KPIs + aging + tabla + top clientes,
 * pero el compound antiguo (Facturas emitidas, Clientes de facturación,
 * Empresas emisoras, Importar) sigue siendo útil como panel operativo.
 * Se accede desde el bloque "Accesos rápidos" de la nueva ingresos.
 */
export default async function FinanzasIngresosGestorPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');
  return (
    <IngresosCompoundPage
      headerTitle="Gestor de facturación"
      headerSubtitle="Facturas emitidas, clientes, empresas emisoras e importación de facturas"
    />
  );
}
