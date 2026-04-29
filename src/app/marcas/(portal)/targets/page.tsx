import { requireRole } from '@/lib/auth-guard';
import { getBrandTargets } from '@/lib/queries/targets';

import { BrandTargetsSpreadsheet } from '@/features/brand-portal/components/BrandTargetsSpreadsheet';

export default async function BrandTargetsPage(): Promise<React.ReactElement> {
  const session = await requireRole('brand', '/marcas/login');
  const targets = await getBrandTargets(session.user.id);
  const pending = targets.filter((target) => target.status === 'pendiente').length;
  const contacted = targets.filter((target) => target.status === 'contactado').length;
  const closed = targets.filter((target) => target.status === 'finalizado').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-black uppercase text-sp-dark mb-2">
          Targets
        </h1>
        <p className="text-sm text-sp-muted">
          Gestiona tu base de perfiles con estados, notas y enlaces de contacto.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Pendientes', value: pending },
          { label: 'Contactados', value: contacted },
          { label: 'Finalizados', value: closed },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-sp-border bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sp-muted">
              {item.label}
            </p>
            <p className="mt-2 font-display text-3xl font-black text-sp-dark tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <BrandTargetsSpreadsheet targets={targets} />
    </div>
  );
}
