import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { listGeneratedContracts } from '@/lib/queries/generatedContracts';
import { ContratosTable } from '@/features/admin/contratos/components/ContratosTable';

export const metadata = { title: 'Contratos | Admin' };

export default async function ContratosPage(): Promise<React.ReactElement> {
  await requirePermission('contratos', 'read');
  const contracts = await listGeneratedContracts();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-text leading-none">Contratos</h1>
          <p className="text-[11px] text-sp-admin-muted mt-1">
            {contracts.length} contrato{contracts.length !== 1 ? 's' : ''} generado{contracts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/campanas/plantillas"
            className="h-9 px-4 rounded-lg border border-sp-admin-border text-[12px] font-semibold text-sp-admin-muted hover:bg-sp-admin-hover hover:text-sp-admin-text transition-colors inline-flex items-center"
          >
            Gestionar plantillas
          </Link>
          <Link
            href="/admin/contratos/nuevo"
            className="h-9 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors inline-flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Nuevo contrato
          </Link>
        </div>
      </div>

      <ContratosTable contracts={contracts} />
    </div>
  );
}
