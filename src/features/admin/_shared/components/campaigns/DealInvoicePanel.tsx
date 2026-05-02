'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { createInvoiceFromDealAction } from '@/app/admin/(dashboard)/campanas/create-invoice-from-deal';
import type { IssuerCompany, IssuedInvoiceWithRelations } from '@/types';

type Props = {
  readonly campaignId:     number;
  readonly existingInvoices: readonly IssuedInvoiceWithRelations[];
  readonly issuers:        readonly IssuerCompany[];
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  borrador:  { label: 'Borrador',         cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  emitida:   { label: 'Emitida',          cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  enviada:   { label: 'Enviada',          cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  cobrada:   { label: 'Cobrada',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  vencida:   { label: 'Vencida',          cls: 'bg-red-50 text-red-700 border-red-200' },
  anulada:   { label: 'Anulada',          cls: 'bg-zinc-100 text-zinc-400 border-zinc-200' },
};

const BTN_P = 'px-3 py-1.5 rounded-lg text-[12px] font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors';
const BTN_G = 'px-3 py-1.5 rounded-lg text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover border border-sp-admin-border transition-colors';
const INPUT_SM = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50';

export function DealInvoicePanel({ campaignId, existingInvoices, issuers }: Props): React.ReactElement {
  const [issuerId,      setIssuerId]      = useState<number>(issuers[0]?.id ?? 0);
  const [warning,       setWarning]       = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [success,       setSuccess]       = useState<{ id: number; number: string } | null>(null);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [isPending,     startTransition]  = useTransition();

  const activeInvoices = existingInvoices.filter((i) => i.status !== 'anulada');

  function doCreate(force = false): void {
    setError(null);
    setWarning(null);
    startTransition(async () => {
      const result = await createInvoiceFromDealAction(campaignId, issuerId, force);
      if (result.error === 'duplicate' && result.warning) {
        setWarning(result.warning);
        setConfirmCreate(true);
      } else if (result.error) {
        setError(result.error);
      } else if (result.success && result.invoiceId) {
        setSuccess({ id: result.invoiceId, number: result.invoiceNumber ?? '' });
        setConfirmCreate(false);
        setWarning(null);
      }
    });
  }

  return (
    <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-sp-admin-border/60 bg-sp-admin-hover/30 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">
            Facturación
          </h3>
          {activeInvoices.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {activeInvoices.length} factura{activeInvoices.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Link href="/admin/facturacion?tab=facturas"
          className="text-[10px] text-sp-admin-accent hover:underline">
          Ver en Facturación →
        </Link>
      </div>

      <div className="p-5 space-y-4">
        {/* Facturas existentes */}
        {activeInvoices.length > 0 && (
          <div className="space-y-2">
            {activeInvoices.map((inv) => {
              const cfg = STATUS_CFG[inv.status] ?? { label: inv.status, cls: 'bg-slate-100 text-slate-500 border-slate-200' };
              return (
                <div key={inv.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                    inv.status === 'cobrada'
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : inv.status === 'vencida'
                      ? 'border-red-200 bg-red-50/30'
                      : 'border-sp-admin-border bg-sp-admin-hover/20'
                  }`}>
                  <span className="text-base" aria-hidden>
                    {inv.status === 'cobrada' ? '✅' : inv.status === 'vencida' ? '⚠️' : '🧾'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-sp-admin-text truncate">
                      {inv.invoiceNumber}
                    </p>
                    <p className="text-[10px] text-sp-admin-muted">
                      {inv.issuerName} · {inv.clientName}
                      {inv.dueDate && inv.status !== 'cobrada' && (
                        <span className={`ml-1.5 ${
                          new Date(inv.dueDate) < new Date() ? 'text-red-500 font-semibold' : ''
                        }`}>
                          · Vence {new Date(inv.dueDate + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-[12px] font-bold tabular-nums text-sp-admin-text">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: inv.currency }).format(Number(inv.totalAmount))}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                  <Link href="/admin/facturacion?tab=facturas"
                    className="text-[10px] text-sp-admin-accent hover:underline shrink-0"
                    title="Ver en Facturación">
                    Ver →
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Éxito */}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-emerald-800">
                ✓ Factura {success.number} creada en borrador
              </p>
              <p className="text-[10px] text-emerald-600 mt-0.5">
                Puedes editarla y emitirla desde el módulo de Facturación.
              </p>
            </div>
            <Link href="/admin/facturacion?tab=facturas" className={BTN_P}>
              Ver factura →
            </Link>
          </div>
        )}

        {/* Warning de duplicado */}
        {warning && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-2">
            <p className="text-[12px] font-semibold text-amber-800">⚠ {warning}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => doCreate(true)} disabled={isPending}
                className={BTN_P}>
                {isPending ? 'Creando…' : 'Crear igualmente'}
              </button>
              <button type="button" onClick={() => { setWarning(null); setConfirmCreate(false); }}
                className={BTN_G}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-[12px] text-red-500 font-medium">⚠ {error}</p>
        )}

        {/* Crear factura */}
        {!success && !warning && (
          <div className="flex items-center gap-3 flex-wrap">
            {issuers.length > 1 && (
              <select value={issuerId} onChange={(e) => setIssuerId(Number(e.target.value))} className={INPUT_SM}>
                {issuers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            )}
            <button type="button" onClick={() => doCreate(false)} disabled={isPending || !issuerId}
              className={`${BTN_P} flex items-center gap-1.5`}>
              {isPending ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                  </svg>
                  Creando…
                </>
              ) : '+ Crear factura desde trato'}
            </button>
            {activeInvoices.length === 0 && (
              <p className="text-[10px] text-sp-admin-muted">
                Se creará como borrador con los datos del trato
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
