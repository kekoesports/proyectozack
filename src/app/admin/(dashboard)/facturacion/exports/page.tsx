import Link from 'next/link';
import { FiscalExports } from '@/features/admin/invoices/components/FiscalExports';

export default function AdminInvoiceExportsPage(): React.ReactElement {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = (Math.ceil(currentMonth / 3) as 1 | 2 | 3 | 4);

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-sp-admin-muted mb-1">
            <Link href="/admin/facturacion" className="hover:text-sp-admin-text transition-colors">
              ← Facturación
            </Link>
          </p>
          <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">
            Exports fiscales
          </h1>
          <p className="text-xs text-sp-admin-muted mt-1">
            Genera los CSV con los totales agregados de los modelos 303, 130 y 347. No son el modelo oficial — sirven como referencia para rellenar la AEAT.
          </p>
        </div>
      </div>

      <FiscalExports years={years} defaultYear={currentYear} defaultQuarter={currentQuarter} />
    </div>
  );
}
