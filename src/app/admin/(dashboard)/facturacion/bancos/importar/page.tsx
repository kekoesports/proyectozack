import { requirePermission } from '@/lib/permissions';
import { listBankAccounts } from '@/lib/queries/bankReconciliation';
import { BankImportWizard } from './BankImportWizard';

export const metadata = { title: 'Importar extracto | Admin' };

export default async function ImportarPage(): Promise<React.ReactElement> {
  await requirePermission('bancos', 'write');
  const accounts = await listBankAccounts();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Importar extracto bancario</h1>
        <p className="text-sm text-sp-admin-muted mt-0.5">
          Sube un CSV o XLSX con movimientos bancarios. El sistema detectará automáticamente las columnas.
        </p>
      </div>
      <BankImportWizard accounts={accounts} />
    </div>
  );
}
