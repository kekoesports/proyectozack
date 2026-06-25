import { requirePermission } from '@/lib/permissions';
import { listInvoices } from '@/lib/queries/invoices';
import { ExpensesClassifyTable } from '@/features/admin/finance-dashboard/components/ExpensesClassifyTable';

export const metadata = { title: 'Costes campaña | Admin' };

export default async function FinanzasCostesPage(): Promise<React.ReactElement> {
  const session = await requirePermission('facturacion', 'read');
  const isStaff = session.user.role === 'staff';
  const visibilityOpts = isStaff ? { staffUserId: session.user.id } : {};

  const [classified, allExpenses] = await Promise.all([
    listInvoices({ kind: 'expense', expenseGroupOrLegacy: 'campaign_direct', ...visibilityOpts }),
    listInvoices({ kind: 'expense', ...visibilityOpts }),
  ]);

  // Gastos con campaignId pero sin expenseGroup asignado aún
  const unclassified = allExpenses.filter(
    (inv) => inv.expenseGroup === null && inv.campaignId !== null,
  );

  return (
    <div className="space-y-8 pt-2">
      <div>
        <h1 className="text-lg font-bold text-sp-admin-fg">Costes de campaña</h1>
        <p className="text-xs text-sp-admin-muted mt-0.5">
          Gastos directamente vinculados a campañas: pagos talento, producción, comisiones.
        </p>
      </div>

      {unclassified.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] bg-amber-500/15 text-amber-400 rounded px-2 py-0.5 font-semibold uppercase tracking-wider">
              Sin clasificar ({unclassified.length})
            </span>
            <span className="text-xs text-sp-admin-muted">Gastos con campaña pero sin expenseGroup asignado</span>
          </div>
          <ExpensesClassifyTable
            invoices={unclassified}
            title="Pendientes de clasificación"
            showClassify
          />
        </div>
      )}

      <ExpensesClassifyTable
        invoices={classified}
        title="Costes de campaña clasificados"
        showClassify={false}
      />
    </div>
  );
}
