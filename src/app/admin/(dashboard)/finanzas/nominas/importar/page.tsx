import { requirePermission } from '@/lib/permissions';
import { getExistingPayrollTxIds } from '@/lib/queries/payrollImport';
import { PayrollImportWizard } from '@/features/admin/finance-payroll/PayrollImportWizard';

export const metadata = { title: 'Importar nóminas | Admin' };

// El OCR ahora corre 100% en el navegador del admin (pdfjs + tesseract.js).
// El server action ocrPayrollPdfAction queda inerte detrás del kill switch
// PAYROLL_OCR_ENABLED (default false). El maxDuration server solo afecta
// al parse vectorial y al apply, que son rápidos.
export const maxDuration = 60;

export default async function PayrollImportPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'write');

  const existingTxIds = await getExistingPayrollTxIds();

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-lg font-bold text-sp-admin-fg">Importar nóminas ELEVATEX</h1>
        <p className="text-xs text-sp-admin-muted mt-0.5">
          Sube el PDF de nóminas. Revisa el preview fila a fila antes de crear los asientos.
          Ningún dato se inserta hasta confirmar explícitamente.
        </p>
      </div>
      <PayrollImportWizard existingTxIds={[...existingTxIds]} />
    </div>
  );
}
