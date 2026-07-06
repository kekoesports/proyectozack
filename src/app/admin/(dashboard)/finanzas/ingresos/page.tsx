import { IngresosCompoundPage } from '@/features/admin/invoices/pages/IngresosCompoundPage';

export const metadata = { title: 'Ingresos · Finanzas' };

export default async function FinanzasIngresosPage(): Promise<React.ReactElement> {
  return <IngresosCompoundPage headerTitle="Ingresos" headerSubtitle="Movimientos, facturas emitidas, clientes y empresas emisoras" />;
}
