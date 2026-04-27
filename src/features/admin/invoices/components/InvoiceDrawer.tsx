'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import {
  createInvoiceAction,
  updateInvoiceAction,
} from '@/app/admin/(dashboard)/facturacion/invoices-actions';
import { EditDrawer } from '@/features/admin/_shared/components/EditDrawer';
import { InvoiceCategoryField } from './InvoiceCategoryField';
import { InvoiceFileFields } from './InvoiceFileFields';
import {
  INVOICE_COMPANIES,
  INVOICE_COMPANY_LABELS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_PAYMENT_METHOD_LABELS,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
} from '@/lib/schemas/invoice';

import type { InvoiceWithRelations } from '@/types';

const INPUT =
  'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const LABEL =
  'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';
const BTN_PRIMARY =
  'rounded-full bg-sp-admin-accent px-4 py-2 text-sm font-bold text-sp-admin-bg transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer';
const BTN_GHOST =
  'rounded-full border border-sp-admin-border px-4 py-2 text-sm font-semibold text-sp-admin-muted transition-colors hover:bg-sp-admin-hover hover:text-sp-admin-text cursor-pointer';

type BrandOption = { readonly id: number; readonly name: string };
type TalentOption = { readonly id: number; readonly name: string };
type CampaignOption = { readonly id: number; readonly label: string };

type Props =
  | {
      readonly mode: 'create';
      readonly isOpen: boolean;
      readonly invoice?: undefined;
      readonly brands: readonly BrandOption[];
      readonly talents: readonly TalentOption[];
      readonly campaigns: readonly CampaignOption[];
      readonly categories: readonly string[];
      readonly onClose: () => void;
    }
  | {
      readonly mode: 'edit';
      readonly isOpen: boolean;
      readonly invoice: InvoiceWithRelations;
      readonly brands: readonly BrandOption[];
      readonly talents: readonly TalentOption[];
      readonly campaigns: readonly CampaignOption[];
      readonly categories: readonly string[];
      readonly onClose: () => void;
    };

/**
 * Drawer lateral con el formulario CRUD de una factura (empresa, categoría, método de pago crypto/banco, ficheros).
 *
 * @kind client
 * @feature admin/invoices
 * @route /admin/facturacion
 */
export function InvoiceDrawer(props: Props): ReactElement {
  // Remount the inner form whenever the target invoice changes — avoids
  // calling setState inside an effect (react-hooks/set-state-in-effect).
  const formKey = props.mode === 'edit' ? `edit-${props.invoice.id}` : 'create';
  return <InvoiceDrawerForm key={formKey} {...props} />;
}

function InvoiceDrawerForm(props: Props): ReactElement {
  const { mode, isOpen, brands, talents, campaigns, categories, onClose } = props;
  const invoice = mode === 'edit' ? props.invoice : null;
  const action = mode === 'create' ? createInvoiceAction : updateInvoiceAction;
  const [state, formAction, isPending] = useActionState(action, {});

  const [net, setNet] = useState<string>(invoice?.netAmount ?? '0.00');
  const [vat, setVat] = useState<string>(invoice?.vatPct ?? '21.00');
  const [withholding, setWithholding] = useState<string>(invoice?.withholdingPct ?? '0.00');

  const total = useMemo(() => {
    const n = Number(net);
    const v = Number(vat);
    const w = Number(withholding);
    if (Number.isNaN(n) || Number.isNaN(v) || Number.isNaN(w)) return '0.00';
    return (n * (1 + (v - w) / 100)).toFixed(2);
  }, [net, vat, withholding]);

  useEffect(() => {
    if (state.success && !isPending) {
      onClose();
    }
  }, [state.success, isPending, onClose]);

  const today = new Date().toISOString().slice(0, 10);
  const title = mode === 'create' ? 'Nueva factura' : `Editar factura ${invoice?.number ?? `#${invoice?.id ?? ''}`}`;

  return (
    <EditDrawer isOpen={isOpen} onClose={onClose} title={title}>
      <form action={formAction} className="flex flex-col gap-4">
        {mode === 'edit' && invoice && <input type="hidden" name="id" value={invoice.id} />}

        {/* Tipo y datos básicos */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="invoice-kind">Tipo *</label>
            <select id="invoice-kind" name="kind" defaultValue={invoice?.kind ?? 'income'} required className={INPUT}>
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="invoice-number">Nº factura</label>
            <input id="invoice-number" name="number" defaultValue={invoice?.number ?? ''} className={INPUT} maxLength={60} />
          </div>
          <div>
            <label className={LABEL} htmlFor="invoice-issue-date">Fecha emisión *</label>
            <input id="invoice-issue-date" name="issueDate" type="date" required defaultValue={invoice?.issueDate ?? today} className={INPUT} />
          </div>
          <div>
            <label className={LABEL} htmlFor="invoice-due-date">Vencimiento</label>
            <input id="invoice-due-date" name="dueDate" type="date" defaultValue={invoice?.dueDate ?? ''} className={INPUT} />
          </div>
        </div>

        {/* Asociaciones */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="invoice-brand">Marca</label>
            <select id="invoice-brand" name="brandId" defaultValue={invoice?.brandId ?? ''} className={INPUT}>
              <option value="">— ninguna —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="invoice-talent">Talent</label>
            <select id="invoice-talent" name="talentId" defaultValue={invoice?.talentId ?? ''} className={INPUT}>
              <option value="">— ninguno —</option>
              {talents.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="invoice-campaign">Campaña</label>
            <select id="invoice-campaign" name="campaignId" defaultValue={invoice?.campaignId ?? ''} className={INPUT}>
              <option value="">— sin vincular —</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="invoice-counterparty">Contraparte libre</label>
            <input id="invoice-counterparty" name="counterpartyName" defaultValue={invoice?.counterpartyName ?? ''} className={INPUT} maxLength={200} />
          </div>
        </div>

        {/* Concepto + Categoría + Status */}
        <div>
          <label className={LABEL} htmlFor="invoice-concept">Concepto *</label>
          <input id="invoice-concept" name="concept" required defaultValue={invoice?.concept ?? ''} placeholder="Campaña abril, comisión casino X…" className={INPUT} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InvoiceCategoryField
            defaultCategory={invoice?.category}
            defaultAiTool={invoice?.aiTool ?? null}
            categories={categories}
          />
          <div>
            <label className={LABEL} htmlFor="invoice-status">Estado</label>
            <select id="invoice-status" name="status" defaultValue={invoice?.status ?? 'borrador'} className={INPUT}>
              {INVOICE_STATUSES.map((s) => (
                <option key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Empresa + método de pago */}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="invoice-company">Empresa fiscal</label>
            <select id="invoice-company" name="company" defaultValue={invoice?.company ?? ''} className={INPUT}>
              <option value="">— sin asignar —</option>
              {INVOICE_COMPANIES.map((value) => (
                <option key={value} value={value}>{INVOICE_COMPANY_LABELS[value]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="invoice-payment-method">Método de pago</label>
            <select id="invoice-payment-method" name="paymentMethod" defaultValue={invoice?.paymentMethod ?? ''} className={INPUT}>
              <option value="">— sin definir —</option>
              {INVOICE_PAYMENT_METHODS.map((value) => (
                <option key={value} value={value}>{INVOICE_PAYMENT_METHOD_LABELS[value]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Importes */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className={LABEL} htmlFor="invoice-net">Neto € *</label>
            <input id="invoice-net" name="netAmount" type="number" step="0.01" min="0" required value={net} onChange={(e) => setNet(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL} htmlFor="invoice-vat">IVA %</label>
            <input id="invoice-vat" name="vatPct" type="number" step="0.01" min="0" value={vat} onChange={(e) => setVat(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL} htmlFor="invoice-withholding">Retención %</label>
            <input id="invoice-withholding" name="withholdingPct" type="number" step="0.01" min="0" value={withholding} onChange={(e) => setWithholding(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL} htmlFor="invoice-total">Total €</label>
            <input id="invoice-total" name="totalAmount" type="number" step="0.01" min="0" value={total} readOnly className={`${INPUT} bg-sp-admin-card`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="invoice-paid-amount">Importe cobrado/pagado €</label>
            <input id="invoice-paid-amount" name="paidAmount" type="number" step="0.01" min="0" defaultValue={invoice?.paidAmount ?? '0.00'} className={INPUT} />
          </div>
          <div>
            <label className={LABEL} htmlFor="invoice-paid-date">Fecha cobro/pago</label>
            <input id="invoice-paid-date" name="paidDate" type="date" defaultValue={invoice?.paidDate ?? ''} className={INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="invoice-series">Serie</label>
            <input id="invoice-series" name="series" defaultValue={invoice?.series ?? 'A'} maxLength={20} className={INPUT} />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-sp-admin-muted/70 self-end pb-2">
            Moneda fija: EUR
          </div>
        </div>

        {/* Archivos */}
        <InvoiceFileFields
          invoiceFile={invoice?.invoiceFile ?? null}
          statementFile={invoice?.statementFile ?? null}
        />

        {/* Notas */}
        <div>
          <label className={LABEL} htmlFor="invoice-notes">Notas</label>
          <textarea id="invoice-notes" name="notes" rows={3} defaultValue={invoice?.notes ?? ''} className={INPUT} />
        </div>

        {state.error && <p className="text-xs text-red-400">{state.error}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-sp-admin-border pt-4">
          <button type="button" onClick={onClose} className={BTN_GHOST}>Cancelar</button>
          <button type="submit" disabled={isPending} className={BTN_PRIMARY}>
            {isPending ? 'Guardando…' : mode === 'create' ? 'Crear factura' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </EditDrawer>
  );
}
