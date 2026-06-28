import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';

export const metadata = { title: 'Herramientas finanzas | Admin' };

export default async function FinanzasHerramientasPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="text-lg font-bold text-sp-admin-fg">Herramientas</h1>
        <p className="text-xs text-sp-admin-muted mt-0.5">
          Importación y configuración de datos financieros.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <Link
          href="/admin/finanzas/nominas/importar"
          className="group flex flex-col gap-2 rounded-xl border border-sp-border bg-sp-admin-card p-5 hover:border-sp-orange/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <h2 className="font-semibold text-sp-admin-fg text-sm">Importar nóminas</h2>
          </div>
          <p className="text-xs text-sp-admin-muted leading-relaxed">
            Sube el PDF de nóminas ELEVATEX. Preview editable por empleado antes de crear los asientos.
            Usa el coste empresa como importe.
          </p>
          <span className="text-xs text-sp-orange font-medium mt-1 group-hover:underline">
            Ir al importador →
          </span>
        </Link>

        <Link
          href="/admin/finanzas/setup-2026"
          className="group flex flex-col gap-2 rounded-xl border border-sp-border bg-sp-admin-card p-5 hover:border-sp-orange/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <h2 className="font-semibold text-sp-admin-fg text-sm">Setup gastos 2026</h2>
          </div>
          <p className="text-xs text-sp-admin-muted leading-relaxed">
            Carga histórica de gastos operativos 2026. Preview editable con validación de duplicados.
            Los datos solo se insertan al confirmar.
          </p>
          <span className="text-xs text-sp-orange font-medium mt-1 group-hover:underline">
            Ir al setup →
          </span>
        </Link>
      </div>
    </div>
  );
}
