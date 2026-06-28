import { requirePermission } from '@/lib/permissions';
import { getExistingSetupTxIds } from '@/lib/queries/setup2026';
import { Setup2026Wizard } from '@/features/admin/finance-setup/Setup2026Wizard';

export const metadata = { title: 'Setup gastos 2026 | Admin' };

export default async function Setup2026Page(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'write');

  const existingTxIds = await getExistingSetupTxIds();

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-lg font-bold text-sp-admin-fg">Configuración gastos 2026</h1>
        <p className="text-xs text-sp-admin-muted mt-0.5">
          Carga histórica de gastos operativos 2026 con preview editable antes de guardar.
          Los datos reales solo se insertan al confirmar explícitamente.
        </p>
      </div>
      <Setup2026Wizard existingTxIds={[...existingTxIds]} />
    </div>
  );
}
