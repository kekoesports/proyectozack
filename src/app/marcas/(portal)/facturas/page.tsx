import { requireRole } from '@/lib/auth-guard';
import { getInvoicesForBrandUser } from '@/lib/queries/invoices';
import type { InvoiceStatus } from '@/types';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  borrador:   'Borrador',
  emitida:    'Emitida',
  cobrada:    'Pagada',
  vencida:    'Vencida',
  anulada:    'Anulada',
  no_cobrado: 'Pendiente',
  no_pagado:  'Pendiente',
  pendiente:  'Pendiente',
};

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  borrador:   'bg-slate-100 text-slate-600',
  emitida:    'bg-blue-100 text-blue-700',
  cobrada:    'bg-emerald-100 text-emerald-700',
  vencida:    'bg-red-100 text-red-700',
  anulada:    'bg-zinc-100 text-zinc-600',
  no_cobrado: 'bg-amber-100 text-amber-700',
  no_pagado:  'bg-amber-100 text-amber-700',
  pendiente:  'bg-amber-100 text-amber-700',
};

function formatMoney(amount: string, currency: string): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
}

function formatDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('es-ES') : '—';
}

export default async function BrandInvoicesPage(): Promise<React.ReactElement> {
  const session = await requireRole('brand', '/marcas/login');
  const invoices = await getInvoicesForBrandUser(session.user.id);

  const totalEmitido = invoices
    .filter((i) => i.status !== 'anulada')
    .reduce((sum, i) => sum + Number(i.totalAmount), 0);
  const totalPendiente = invoices
    .filter((i) => i.status === 'emitida')
    .reduce((sum, i) => sum + Number(i.totalAmount), 0);

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-4xl font-black uppercase text-sp-dark mb-2">Facturas</h1>
      <p className="text-sm text-sp-muted mb-8">Histórico de facturas que tu marca ha recibido de SocialPro.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Kpi label="Facturas" value={invoices.length.toString()} />
        <Kpi label="Total emitido" value={invoices[0] ? formatMoney(totalEmitido.toFixed(2), invoices[0].currency) : '—'} />
        <Kpi label="Pendiente de pago" value={invoices[0] ? formatMoney(totalPendiente.toFixed(2), invoices[0].currency) : '—'} accent="amber" />
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sp-border p-12 text-center">
          <p className="text-sm text-sp-muted">Aún no hay facturas asociadas a tu cuenta.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-sp-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-border bg-sp-bg2">
                <th className="text-left px-4 py-3 font-semibold text-sp-muted text-[11px] uppercase tracking-wider">Nº</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-muted text-[11px] uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-muted text-[11px] uppercase tracking-wider">Concepto</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-muted text-[11px] uppercase tracking-wider">Vencimiento</th>
                <th className="text-right px-4 py-3 font-semibold text-sp-muted text-[11px] uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-muted text-[11px] uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-muted text-[11px] uppercase tracking-wider">PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-sp-border/60 last:border-0 hover:bg-sp-bg2/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-sp-muted">{inv.number ?? `#${inv.id}`}</td>
                  <td className="px-4 py-3 text-sp-muted text-xs">{formatDate(inv.issueDate)}</td>
                  <td className="px-4 py-3 text-sp-dark">
                    <p className="line-clamp-1">{inv.concept}</p>
                    {inv.category && <p className="text-[10px] uppercase tracking-wider text-sp-muted mt-0.5">{inv.category}</p>}
                  </td>
                  <td className="px-4 py-3 text-sp-muted text-xs">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-sp-dark tabular-nums">
                    {formatMoney(inv.totalAmount, inv.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[inv.status]}`}>
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.fileUrl ? (
                      <a href={inv.fileUrl} target="_blank" rel="noreferrer" className="text-sp-orange hover:underline text-xs font-semibold">
                        Descargar
                      </a>
                    ) : (
                      <span className="text-xs text-sp-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent = 'default' }: { readonly label: string; readonly value: string; readonly accent?: 'default' | 'amber' }): React.ReactElement {
  const color = accent === 'amber' ? 'text-amber-600' : 'text-sp-dark';
  return (
    <div className="rounded-2xl bg-white border border-sp-border p-5">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-muted mb-2">{label}</p>
      <p className={`font-display text-3xl font-black ${color} tabular-nums`}>{value}</p>
    </div>
  );
}
