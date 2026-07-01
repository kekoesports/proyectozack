import Link from 'next/link';
import type {
  FinanzasResumenPendienteBucket,
  FinanzasResumenPendientes,
  PendienteItem,
} from '@/types/finanzasResumen';
import { SectionCard } from './SectionCard';

const EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});
const EUR2 = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 2,
});

type Props = { readonly pendientes: FinanzasResumenPendientes };

export function ResumenPendientesBlock({ pendientes }: Props): React.ReactElement {
  return (
    <SectionCard title="Pendientes destacados" subtitle="Lo que queda por cobrar, por pagar a talentos y por pagar operativo. Top 5 por importe.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PendienteColumn
          label="Pendiente de cobro (campañas)"
          bucket={pendientes.cobrosCampanas}
          href="/admin/finanzas/cobros"
          hrefLabel="Ver todos los cobros pendientes →"
          accent="income"
        />
        <PendienteColumn
          label="Pendiente de pago a talentos"
          bucket={pendientes.pagosTalento}
          href="/admin/finanzas/gastos"
          hrefLabel="Ver todos los gastos →"
          accent="expense"
        />
        <PendienteColumn
          label="Pendiente de pago operativo"
          bucket={pendientes.pagosOperativo}
          href="/admin/finanzas/gastos"
          hrefLabel="Ver todos los gastos →"
          accent="expense"
        />
      </div>

      <div className="mt-4 rounded-xl border border-sp-admin-border/60 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sp-admin-muted">
            Margen pendiente estimado
          </span>
          <span className={`text-2xl font-black tabular-nums ${pendientes.margenPendienteEstimado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {EUR.format(pendientes.margenPendienteEstimado)}
          </span>
        </div>
        <p className="mt-1 text-[10px] italic text-sp-admin-muted">
          = pendiente de cobro campañas − pendiente de pago a talentos
        </p>
      </div>
    </SectionCard>
  );
}

// ── Columna por bucket ─────────────────────────────────────────────────────

type ColumnProps = {
  readonly label: string;
  readonly bucket: FinanzasResumenPendienteBucket;
  readonly href: string;
  readonly hrefLabel: string;
  readonly accent: 'income' | 'expense';
};

function PendienteColumn({ label, bucket, href, hrefLabel, accent }: ColumnProps): React.ReactElement {
  const totalColor = accent === 'income' ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-sp-admin-border/60 p-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sp-admin-muted">
          {label}
        </p>
        <p className={`mt-1 text-2xl font-black tabular-nums ${totalColor}`}>
          {EUR.format(bucket.total)}
        </p>
        <p className="text-[10px] text-sp-admin-muted">
          {bucket.count === 0 ? 'sin pendientes' : bucket.count === 1 ? '1 factura' : `${bucket.count} facturas`}
        </p>
      </div>

      {bucket.top.length === 0 ? (
        <p className="py-2 text-center text-xs italic text-sp-admin-muted">Al día ✓</p>
      ) : (
        <ul className="space-y-1.5">
          {bucket.top.map((it) => (
            <PendienteRow key={`${it.source}-${it.id}`} item={it} accent={accent} />
          ))}
        </ul>
      )}

      <Link
        href={href}
        className="mt-auto text-xs text-sp-blue hover:underline"
      >
        {hrefLabel}
      </Link>
    </div>
  );
}

// ── Fila de item ───────────────────────────────────────────────────────────

function PendienteRow({ item, accent }: { readonly item: PendienteItem; readonly accent: 'income' | 'expense' }): React.ReactElement {
  const amountColor = accent === 'income' ? 'text-emerald-400' : 'text-red-400';
  const overdueColor = 'text-red-400';
  const dueBadge = item.daysOverdue !== null && item.daysOverdue > 0
    ? <span className={`ml-2 text-[9px] font-semibold uppercase tracking-wider ${overdueColor}`}>
        · vencida hace {item.daysOverdue}d
      </span>
    : null;

  return (
    <li className="flex items-baseline justify-between gap-2 text-xs">
      <span className="min-w-0 truncate text-sp-admin-fg">
        {item.label}
        {dueBadge}
      </span>
      <span className={`shrink-0 tabular-nums ${amountColor}`}>
        {EUR2.format(item.amount)}
      </span>
    </li>
  );
}
