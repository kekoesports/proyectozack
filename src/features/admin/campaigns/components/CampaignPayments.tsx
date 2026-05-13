'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  markInvoicePaidAction,
  annulInvoiceAction,
} from '@/app/admin/(dashboard)/facturacion/invoices-actions';

import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import { EmptyState }  from '@/features/admin/_shared/components/EmptyState';
import {
  INVOICE_COMPANIES,
  INVOICE_PAYMENT_METHODS,
} from '@/lib/schemas/invoice';
import { CAMPAIGN_PAYMENT_METHODS } from '@/lib/schemas/campaign';
import { addDealMovimientoAction } from '@/app/admin/(dashboard)/campanas/deal-movimiento-action';

import type { Tone }                        from '@/features/admin/_shared/components/StateBadge';
import type { Invoice }                     from '@/types';
import type { CampaignWithRelations }       from '@/lib/queries/campaigns';
import type { CampaignPaymentDerivedStatus } from '@/lib/schemas/campaign';

// ── Helpers ───────────────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PAYMENT_METHOD_LABELS: Record<(typeof CAMPAIGN_PAYMENT_METHODS)[number], string> = {
  banco:          'Banco SocialPro España',
  crypto:         'Crypto',
  banco_agencia:  'Banco agencia',
  banco_stark:    'SocialPro Stark',
  crypto_agencia: 'Crypto agencia',
  crypto_zack:    'Crypto Zack',
  otro:           'Otro',
};

const COMPANY_LABELS: Record<(typeof INVOICE_COMPANIES)[number], string> = {
  spain:          'SocialPro España',
  andorra:        'SocialPro Andorra',
  argentina:      'SocialPro Argentina',
  spain_andorra:  'España + Andorra',
  spain_argentina: 'España + Argentina',
};

const PAY_METHOD_LABELS: Record<(typeof INVOICE_PAYMENT_METHODS)[number], string> = {
  banco:          'Banco SocialPro España',
  crypto:         'Crypto',
  banco_agencia:  'Banco agencia',
  banco_stark:    'SocialPro Stark',
  crypto_agencia: 'Crypto agencia',
  crypto_zack:    'Crypto Zack',
  otro:           'Otro',
};

const INV_STATUS_TONE: Record<Invoice['status'], Tone> = {
  borrador:   'neutral', emitida:    'warning', cobrada:    'success',
  vencida:    'danger',  anulada:    'neutral', pagada:     'success',
  parcial:    'info',    no_cobrada: 'warning', no_pagada:  'warning',
  no_cobrado: 'warning', no_pagado:  'warning', pendiente:  'info',
};

const INV_STATUS_LABEL: Record<Invoice['status'], string> = {
  borrador: 'Borrador', emitida: 'Emitida', cobrada: 'Cobrada',
  vencida:  'Vencida',  anulada: 'Anulada', pagada:  'Pagada',
  parcial:  'Parcial',  no_cobrada: 'No cobrada', no_pagada: 'No pagada',
  no_cobrado: 'No cobrado', no_pagado: 'No pagado', pendiente: 'Pendiente',
};

const KIND_LABEL: Record<Invoice['kind'], string> = {
  income:  'Ingreso marca',
  expense: 'Pago / gasto',
};

function payTone(s: CampaignPaymentDerivedStatus): Tone {
  return s === 'si' ? 'success' : s === 'parcial' ? 'warning' : 'neutral';
}
function payLabel(s: CampaignPaymentDerivedStatus): string {
  return s === 'si' ? 'Cobrado / Pagado' : s === 'parcial' ? 'Parcial' : 'Pendiente';
}

// ── Input helpers ─────────────────────────────────────────────────────────────

const inputCls = 'h-9 w-full rounded-lg border border-sp-admin-border bg-white px-3 text-[13px] text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const selectCls = `${inputCls} bg-white`;

// ── PayBlock ──────────────────────────────────────────────────────────────────

function PayBlock({
  title, status, amount, invoiced, method, color,
}: {
  readonly title:    string;
  readonly status:   CampaignPaymentDerivedStatus;
  readonly amount:   number;
  readonly invoiced: number;
  readonly method:   string | null | undefined;
  readonly color:    string;
}): React.ReactElement {
  const isPaid    = status === 'si';
  const isPartial = status === 'parcial';
  const isPending = status === 'no';

  return (
    <div className="rounded-xl border bg-sp-admin-card overflow-hidden"
      style={{ borderColor: isPaid ? '#16a34a40' : isPartial ? '#f59e0b40' : '#e2e2ec' }}>
      <div className="h-[3px]" style={{ background: isPaid ? '#16a34a' : isPartial ? '#f59e0b' : color }} />
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sp-admin-muted">{title}</p>
          <StateBadge tone={payTone(status)}>{payLabel(status)}</StateBadge>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">Previsto</p>
            <p className="text-[18px] font-black tabular-nums text-sp-admin-text mt-0.5">{EUR.format(amount)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">
              {isPaid || isPartial ? 'Registrado' : 'Pendiente'}
            </p>
            <p className={`text-[18px] font-black tabular-nums mt-0.5 ${invoiced > 0 ? 'text-emerald-600' : 'text-sp-admin-muted'}`}>
              {EUR.format(invoiced)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">Método</p>
            <p className="text-[12px] font-semibold text-sp-admin-text mt-0.5">
              {method
                ? (PAYMENT_METHOD_LABELS[method as (typeof CAMPAIGN_PAYMENT_METHODS)[number]] ?? method)
                : '—'}
            </p>
          </div>
        </div>
        {isPending && amount > 0 && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M7 1L13 12H1L7 1Z" stroke="#f59e0b" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M7 5v3" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="7" cy="10" r="0.6" fill="#f59e0b"/>
            </svg>
            <p className="text-[11px] font-medium text-amber-700">
              {EUR.format(amount - invoiced)} pendiente de {title === 'Cobro de marca' ? 'cobrar' : 'pagar'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CreateMovimientoModal ─────────────────────────────────────────────────────

type MovimientoType = 'income_brand' | 'expense_talent' | 'expense_op';

const TIPO_OPTIONS: { key: MovimientoType; label: string; icon: string; desc: string }[] = [
  { key: 'income_brand',   label: 'Ingreso de marca',    icon: '↑', desc: 'Pago recibido de la marca' },
  { key: 'expense_talent', label: 'Pago al talento',     icon: '↓', desc: 'Transferencia al creador'   },
  { key: 'expense_op',     label: 'Gasto operativo',     icon: '○', desc: 'Gasto asociado al trato'    },
];

function CreateMovimientoModal({
  campaign,
  onClose,
  onSuccess,
  initialTipo = 'income_brand',
}: {
  readonly campaign:    CampaignWithRelations;
  readonly onClose:     () => void;
  readonly onSuccess:   () => void;
  readonly initialTipo?: MovimientoType;
}): React.ReactElement {
  const today = new Date().toISOString().slice(0, 10);

  const [tipo,    setTipo]    = useState<MovimientoType>(initialTipo);
  const [concept, setConcept] = useState('');
  const [amount,  setAmount]  = useState('');
  const [date,    setDate]    = useState(today);
  const [status,  setStatus]  = useState<'pendiente' | 'cobrada' | 'borrador'>('pendiente');
  const [company, setCompany] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('');
  const [notes,   setNotes]   = useState('');
  const [error,   setError]   = useState('');
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Actualizar concepto e importe al cambiar tipo
  function handleTipo(t: MovimientoType): void {
    setTipo(t);
    if (t === 'income_brand') {
      setConcept(`Campaña: ${campaign.name}`);
      setAmount(String(Number(campaign.amountBrand ?? 0)));
    } else if (t === 'expense_talent') {
      setConcept(`Pago talento: ${campaign.name}`);
      setAmount(String(Number(campaign.amountTalent ?? 0)));
    } else {
      setConcept(`Gasto operativo: ${campaign.name}`);
      setAmount('');
    }
  }

  // Inicializar al montar
  useState(() => { handleTipo('income_brand'); });

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError('El importe debe ser mayor que 0'); return; }
    setError('');

    const kind:      'income' | 'expense' = tipo === 'income_brand' ? 'income' : 'expense';
    const brandId  = tipo !== 'expense_op' ? campaign.brandId  : undefined;
    const talentId = tipo === 'expense_talent' ? campaign.talentId : undefined;

    startTransition(async () => {
      const result = await addDealMovimientoAction({
        campaignId:    campaign.id,
        kind,
        concept,
        totalAmount:   Number(amount),
        issueDate:     date,
        status:        status === 'cobrada' ? 'cobrada' : status === 'borrador' ? 'borrador' : 'pendiente',
        brandId:       brandId ?? null,
        talentId:      talentId ?? null,
        company:       company !== '' ? company as (typeof INVOICE_COMPANIES)[number] : null,
        paymentMethod: payMethod !== '' ? payMethod as (typeof INVOICE_PAYMENT_METHODS)[number] : null,
        notes:         notes !== '' ? notes : null,
      });

      if (result.success) {
        router.refresh();
        onSuccess();
      } else {
        setError(result.error ?? 'Error al crear el movimiento');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
      <div
        className="relative bg-sp-admin-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-admin-border">
          <div>
            <h2 className="text-[15px] font-bold text-sp-admin-text">Registrar movimiento</h2>
            <p className="text-[11px] text-sp-admin-muted mt-0.5 truncate max-w-[300px]">{campaign.name}</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sp-admin-muted hover:bg-sp-admin-hover transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Datos del trato (read-only) */}
          <div className="rounded-lg bg-sp-admin-hover/50 border border-sp-admin-border/60 px-4 py-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">Marca</p>
              <p className="text-[12px] font-semibold text-sp-admin-text">{campaign.brand?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">Influencer</p>
              <p className="text-[12px] font-semibold text-sp-admin-text">{campaign.talent?.name ?? '—'}</p>
            </div>
          </div>

          {/* Tipo */}
          <div>
            <p className="text-[11px] font-semibold text-sp-admin-muted uppercase tracking-wide mb-2">Tipo de movimiento</p>
            <div className="grid grid-cols-3 gap-2">
              {TIPO_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleTipo(t.key)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    tipo === t.key
                      ? 'border-sp-admin-accent bg-sp-admin-accent/5 shadow-sm'
                      : 'border-sp-admin-border hover:border-sp-admin-accent/40 hover:bg-sp-admin-hover'
                  }`}
                >
                  <span className={`text-lg font-black ${tipo === t.key ? 'text-sp-admin-accent' : 'text-sp-admin-muted'}`}>
                    {t.icon}
                  </span>
                  <p className="text-[11px] font-bold text-sp-admin-text mt-1 leading-tight">{t.label}</p>
                  <p className="text-[9px] text-sp-admin-muted mt-0.5 leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Concepto */}
          <div>
            <label className="text-[11px] font-semibold text-sp-admin-muted uppercase tracking-wide block mb-1.5">
              Concepto *
            </label>
            <input
              type="text"
              required
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Descripción del movimiento"
              className={inputCls}
            />
          </div>

          {/* Importe + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-sp-admin-muted uppercase tracking-wide block mb-1.5">
                Importe (€) *
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-sp-admin-muted uppercase tracking-wide block mb-1.5">
                Fecha *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="text-[11px] font-semibold text-sp-admin-muted uppercase tracking-wide block mb-1.5">
              Estado
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className={selectCls}
            >
              <option value="pendiente">Pendiente</option>
              <option value="cobrada">Cobrado / Pagado</option>
              <option value="borrador">Borrador</option>
            </select>
          </div>

          {/* Entidad + Método */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-sp-admin-muted uppercase tracking-wide block mb-1.5">
                Entidad emisora
              </label>
              <select value={company} onChange={(e) => setCompany(e.target.value)} className={selectCls}>
                <option value="">Sin especificar</option>
                {INVOICE_COMPANIES.map((c) => (
                  <option key={c} value={c}>{COMPANY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-sp-admin-muted uppercase tracking-wide block mb-1.5">
                Método de pago
              </label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className={selectCls}>
                <option value="">Sin especificar</option>
                {INVOICE_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{PAY_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-[11px] font-semibold text-sp-admin-muted uppercase tracking-wide block mb-1.5">
              Notas internas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observaciones opcionales…"
              className={`${inputCls} h-auto py-2 resize-none`}
            />
          </div>

          {/* Error */}
          {error !== '' && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-[12px] text-red-700">
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-sp-admin-border">
            <button type="button" onClick={onClose}
              className="h-9 px-4 rounded-lg border border-sp-admin-border text-[13px] text-sp-admin-muted hover:bg-sp-admin-hover transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="h-9 px-5 rounded-lg bg-sp-admin-accent text-white text-[13px] font-semibold hover:bg-sp-admin-accent/90 active:scale-95 transition-all">
              Registrar movimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── InvoiceActionRow ──────────────────────────────────────────────────────────

function InvoiceActionRow({
  inv,
  campaignId: _campaignId,
}: {
  readonly inv: Invoice;
  readonly campaignId: number;
}): React.ReactElement {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const isPaid    = inv.status === 'cobrada' || inv.status === 'pagada';
  const isAnulled = inv.status === 'anulada';
  const paidLabel = inv.kind === 'income' ? 'Cobrada' : 'Pagada';

  function handleMarkPaid(): void {
    startTransition(async () => {
      await markInvoicePaidAction(inv.id);
      router.refresh();
    });
  }

  function handleAnnul(): void {
    if (!confirm(`¿Anular el movimiento "${inv.concept}"?`)) return;
    startTransition(async () => {
      await annulInvoiceAction(inv.id);
      router.refresh();
    });
  }

  return (
    <tr className={`border-b border-sp-admin-border/50 last:border-0 transition-colors ${isAnulled ? 'opacity-50' : 'hover:bg-sp-admin-hover'}`}>
      <td className="px-5 py-3">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${
          inv.kind === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {inv.kind === 'income' ? '↑' : '↓'} {KIND_LABEL[inv.kind]}
        </span>
      </td>
      <td className="px-5 py-3 text-[13px] text-sp-admin-text max-w-[200px] truncate">{inv.concept}</td>
      <td className="px-5 py-3 text-[13px] font-semibold tabular-nums"
        style={{ color: inv.kind === 'income' ? '#16a34a' : '#f59e0b' }}>
        {EUR.format(Number(inv.totalAmount))}
      </td>
      <td className="px-5 py-3">
        <StateBadge tone={INV_STATUS_TONE[inv.status]}>
          {INV_STATUS_LABEL[inv.status]}
        </StateBadge>
      </td>
      <td className="px-5 py-3 text-[11px] text-sp-admin-muted whitespace-nowrap">
        {formatDate(inv.issueDate)}
      </td>
      <td className="px-5 py-3 text-[11px] text-sp-admin-muted">
        {inv.paymentMethod
          ? (PAY_METHOD_LABELS[inv.paymentMethod as (typeof INVOICE_PAYMENT_METHODS)[number]] ?? inv.paymentMethod)
          : '—'}
      </td>
      {/* Comprobante / TXID */}
      <td className="px-5 py-3">
        {(inv.txId || inv.receiptFileUrl) ? (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 w-fit">
              ✓ Verificado
            </span>
            {inv.txId && (
              <span className="text-[10px] text-sp-admin-muted font-mono truncate max-w-[120px]" title={inv.txId}>
                {inv.txId}
              </span>
            )}
            {inv.receiptFileUrl && (
              <a href={inv.receiptFileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-sp-admin-accent hover:underline">
                Ver comprobante ↗
              </a>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-sp-admin-muted/50">Sin comprobante</span>
        )}
      </td>
      {/* Acciones */}
      <td className="px-5 py-3 whitespace-nowrap">
        {!isPaid && !isAnulled && (
          <button
            type="button"
            onClick={handleMarkPaid}
            className="h-6 px-2 rounded text-[10px] font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors mr-1"
          >
            ✓ {paidLabel}
          </button>
        )}
        {!isAnulled && (
          <button
            type="button"
            onClick={handleAnnul}
            className="h-6 px-2 rounded text-[10px] font-semibold text-sp-admin-muted hover:text-red-500 transition-colors"
          >
            Anular
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type Props = {
  readonly invoices: readonly Invoice[];
  readonly campaign: CampaignWithRelations;
};

export function CampaignPayments({ invoices, campaign }: Props): React.ReactElement {
  const [showModal, setShowModal]   = useState(false);
  const [modalTipo, setModalTipo]   = useState<MovimientoType>('income_brand');

  return (
    <div className="space-y-4">

      {/* ── Bloques cobro / pago ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PayBlock
          title="Cobro de marca"
          status={campaign.brandPaid}
          amount={Number(campaign.amountBrand ?? 0)}
          invoiced={campaign.totalInvoicedBrand}
          method={campaign.brandPaymentMethod}
          color="#8b3aad"
        />
        <PayBlock
          title="Pago al talento"
          status={campaign.talentPaid}
          amount={Number(campaign.amountTalent ?? 0)}
          invoiced={campaign.totalPaidTalent}
          method={campaign.talentPaymentMethod}
          color="#5b9bd5"
        />
      </div>

      {/* ── Alerta contextual: marca pagó → pendiente pagar talento ─ */}
      {campaign.brandPaid === 'si' && campaign.talentPaid === 'no' && Number(campaign.amountTalent ?? 0) > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-amber-500 text-[16px] shrink-0 mt-0.5" aria-hidden>⚡</span>
          <div className="flex-1">
            <p className="text-[12px] font-bold text-amber-800">La marca ha pagado — talento pendiente de cobro</p>
            <p className="text-[11px] text-amber-700/80 mt-0.5">
              Registra el pago al talento por {EUR.format(Number(campaign.amountTalent))} para cerrar el flujo financiero del trato.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setModalTipo('expense_talent'); setShowModal(true); }}
            className="h-8 px-3 rounded-lg bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 transition-colors shrink-0"
          >
            Pagar talento
          </button>
        </div>
      )}

      {/* ── Resumen financiero ────────────────────────────────────── */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted mb-3">
          Resumen financiero del trato
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide">Pago marca</p>
            <p className="text-[16px] font-bold tabular-nums text-sp-admin-text">
              {EUR.format(Number(campaign.amountBrand ?? 0))}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide">Pago talento</p>
            <p className="text-[16px] font-bold tabular-nums text-sp-admin-text">
              {EUR.format(Number(campaign.amountTalent ?? 0))}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-sp-admin-muted uppercase tracking-wide">Comisión SocialPro</p>
            <p className="text-[16px] font-bold tabular-nums"
              style={{ color: campaign.commissionAmount >= 0 ? '#16a34a' : '#ef4444' }}>
              {EUR.format(campaign.commissionAmount)}
              {Number(campaign.amountBrand ?? 0) > 0 && (
                <span className="text-[11px] font-normal text-sp-admin-muted ml-1">
                  ({campaign.commissionPct.toFixed(1)}%)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Movimientos de facturación ────────────────────────────── */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-sp-admin-border">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[12px] font-bold text-sp-admin-text">
                Movimientos de facturación
                {invoices.length > 0 && (
                  <span className="ml-1.5 text-[10px] font-normal text-sp-admin-muted">
                    ({invoices.length})
                  </span>
                )}
              </p>
              <Link
                href="/admin/facturacion"
                className="text-[10px] font-semibold text-sp-admin-accent hover:underline"
                title="Ver todos los movimientos en Facturación"
              >
                Ver en Facturación →
              </Link>
            </div>
            <p className="text-[10px] text-sp-admin-muted mt-0.5">
              Registra cobros de la marca y pagos al talento. Usa ✓ para marcar como cobrado/pagado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            Registrar movimiento
          </button>
        </div>

        {invoices.length === 0 ? (
          <EmptyState
            title="Sin movimientos registrados"
            description="Usa el botón para registrar ingresos de marca o pagos al talento vinculados a este trato."
            action={
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-sp-admin-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                + Registrar primer movimiento
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sp-admin-border bg-sp-admin-hover/30">
                  {['Tipo', 'Concepto', 'Importe', 'Estado', 'Fecha', 'Método', 'Comprobante', ''].map((h) => (
                    <th key={h}
                      className="text-left px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-sp-admin-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <InvoiceActionRow
                    key={inv.id}
                    inv={inv}
                    campaignId={campaign.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <CreateMovimientoModal
          campaign={campaign}
          initialTipo={modalTipo}
          onClose={() => { setShowModal(false); setModalTipo('income_brand'); }}
          onSuccess={() => { setShowModal(false); setModalTipo('income_brand'); }}
        />
      )}
    </div>
  );
}
