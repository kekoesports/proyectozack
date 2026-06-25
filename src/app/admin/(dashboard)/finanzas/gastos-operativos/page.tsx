import { requirePermission } from '@/lib/permissions';
import { listInvoices } from '@/lib/queries/invoices';
import { ExpensesClassifyTable } from '@/features/admin/finance-dashboard/components/ExpensesClassifyTable';

export const metadata = { title: 'Gastos operativos | Admin' };

export default async function FinanzasGastosOperativosPage(): Promise<React.ReactElement> {
  const session = await requirePermission('facturacion', 'read');
  const isStaff = session.user.role === 'staff';
  const visibilityOpts = isStaff ? { staffUserId: session.user.id } : {};

  const invoices = await listInvoices({ kind: 'expense', expenseGroupOrLegacy: 'operational', ...visibilityOpts });

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-lg font-bold text-sp-admin-fg">Gastos operativos</h1>
        <p className="text-xs text-sp-admin-muted mt-0.5">
          Gastos de estructura: software, gestoría, fiscal, bancarios, etc. Incluye facturas legacy sin campaña.
        </p>
      </div>

      <ExpensesClassifyTable
        invoices={invoices}
        title="Gastos operativos"
        showClassify
      />
    </div>
  );
}
