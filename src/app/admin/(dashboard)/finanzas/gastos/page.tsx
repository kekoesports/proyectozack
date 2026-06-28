import { requirePermission } from '@/lib/permissions';
import { listInvoices } from '@/lib/queries/invoices';
import { GastosPageClient } from './GastosPageClient';

export const metadata = { title: 'Gastos | Finanzas Admin' };

export default async function FinanzasGastosPage(): Promise<React.ReactElement> {
  const session = await requirePermission('facturacion', 'read');
  const isStaff = session.user.role === 'staff';
  const visibilityOpts = isStaff ? { staffUserId: session.user.id } : {};

  const [directos, operativos, allExpenses] = await Promise.all([
    listInvoices({ kind: 'expense', expenseGroupOrLegacy: 'campaign_direct', ...visibilityOpts }),
    listInvoices({ kind: 'expense', expenseGroupOrLegacy: 'operational', ...visibilityOpts }),
    listInvoices({ kind: 'expense', ...visibilityOpts }),
  ]);

  const sinClasificar = allExpenses.filter((inv) => inv.expenseGroup === null);

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-lg font-bold text-sp-admin-fg">Gastos</h1>
        <p className="text-xs text-sp-admin-muted mt-0.5">
          Costes directos de campaña, gastos operativos y gastos pendientes de clasificar.
        </p>
      </div>
      <GastosPageClient
        directos={directos}
        operativos={operativos}
        sinClasificar={sinClasificar}
      />
    </div>
  );
}
