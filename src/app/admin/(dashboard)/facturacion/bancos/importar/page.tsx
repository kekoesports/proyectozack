import { requireFinancialPageSecurity } from '@/lib/security/financial-security';
import { listBankAccounts } from '@/lib/queries/bankReconciliation';
import { BankImportWizard } from './BankImportWizard';

export const metadata = { title: 'Importar extracto | Admin' };

export default async function ImportarPage({ searchParams }: {
  readonly searchParams: Promise<{ provider?: string }>;
}): Promise<React.ReactElement> {
  await requireFinancialPageSecurity('write');
  const params = await searchParams;
  const wiseMode = params.provider === 'wise';
  const allAccounts = await listBankAccounts();
  const accounts = wiseMode ? allAccounts.filter((account) => account.provider === 'wise') : allAccounts;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">{wiseMode ? 'Importar extracto de Wise' : 'Importar extracto bancario'}</h1>
        <p className="text-sm text-sp-admin-muted mt-0.5">
          {wiseMode
            ? 'Descarga en Wise un extracto contable CSV o XLSX para una sola moneda. Se importará únicamente en la cuenta Wise de ELEVATEX seleccionada.'
            : 'Sube un CSV o XLSX con movimientos bancarios. El sistema detectará automáticamente las columnas.'}
        </p>
      </div>
      {wiseMode ? (
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-sm">
          <p className="font-semibold text-sky-400">Importación segura, sin acceso para mover dinero</p>
          <p className="mt-1 text-xs text-sp-admin-muted">
            En Wise: Extractos e informes → Extracto → formato CSV o XLSX. Selecciona una sola divisa y el mismo periodo que quieras conciliar.
          </p>
        </div>
      ) : null}
      {wiseMode && accounts.length === 0 ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
          Primero crea en Cuentas bancarias una cuenta con proveedor Wise, entidad ELEVATEX y su moneda correspondiente.
        </div>
      ) : null}
      <BankImportWizard accounts={accounts} wiseMode={wiseMode} />
    </div>
  );
}
