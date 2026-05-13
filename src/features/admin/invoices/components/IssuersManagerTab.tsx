'use client';

import { useActionState, useState } from 'react';
import { updateIssuerCompanyAction } from '@/app/admin/(dashboard)/facturacion/issued-invoices-actions';
import type { IssuerCompany } from '@/types';

// ── Constantes ────────────────────────────────────────────────────────

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;

const INPUT  = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const LABEL  = 'block text-[10px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';
const TEXTAR = `${INPUT} resize-none`;

// ── Props ─────────────────────────────────────────────────────────────

type Props = {
  readonly issuers:  readonly IssuerCompany[];
  readonly isAdmin:  boolean;
};

// ── Edit Form (inline) ────────────────────────────────────────────────

type EditState = { readonly error?: string; readonly success?: boolean };

function IssuerEditForm({
  issuer,
  onDone,
}: {
  readonly issuer:  IssuerCompany;
  readonly onDone:  () => void;
}): React.ReactElement {
  const [state, formAction, isPending] = useActionState<EditState, FormData>(updateIssuerCompanyAction, {});

  if (state.success) {
    onDone();
    return <></>;
  }

  return (
    <form action={formAction} className="space-y-4 px-5 py-4 bg-sp-admin-hover/20 border-t border-sp-admin-border">
      <input type="hidden" name="id" value={issuer.id} />

      {/* Datos básicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Nombre comercial *</label>
          <input name="name" required defaultValue={issuer.name} className={INPUT} maxLength={200} />
        </div>
        <div>
          <label className={LABEL}>Razón social</label>
          <input name="legalName" defaultValue={issuer.legalName ?? ''} className={INPUT} maxLength={250} />
        </div>
        <div>
          <label className={LABEL}>NIF / Tax ID</label>
          <input name="taxId" defaultValue={issuer.taxId ?? ''} className={INPUT} maxLength={30} />
        </div>
        <div>
          <label className={LABEL}>País</label>
          <input name="country" defaultValue={issuer.country ?? ''} className={INPUT} maxLength={50} />
        </div>
        <div>
          <label className={LABEL}>Ciudad</label>
          <input name="city" defaultValue={issuer.city ?? ''} className={INPUT} maxLength={100} />
        </div>
        <div>
          <label className={LABEL}>Código postal</label>
          <input name="postalCode" defaultValue={issuer.postalCode ?? ''} className={INPUT} maxLength={20} />
        </div>
        <div>
          <label className={LABEL}>Email</label>
          <input name="email" type="email" defaultValue={issuer.email ?? ''} className={INPUT} maxLength={180} />
        </div>
        <div>
          <label className={LABEL}>Moneda por defecto</label>
          <select name="defaultCurrency" defaultValue={issuer.defaultCurrency ?? 'EUR'} className={INPUT}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Serie de facturación */}
      <div className="rounded-lg border border-sp-admin-border/60 bg-sp-admin-card p-3 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">Serie de facturación</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Prefijo de serie *</label>
            <input name="invoiceSeriesPrefix" required defaultValue={issuer.invoiceSeriesPrefix ?? 'SP'} className={INPUT} maxLength={10}
              placeholder="ES, AD, US…" />
            <p className="text-[9px] text-sp-admin-muted mt-1">Ejemplo: ES → ES-2026-0001</p>
          </div>
          <div>
            <label className={LABEL}>Próximo número</label>
            <input readOnly value={issuer.nextInvoiceNumber ?? 1}
              className={`${INPUT} bg-sp-admin-hover/30 cursor-not-allowed text-sp-admin-muted`} />
            <p className="text-[9px] text-sp-admin-muted mt-1">Se incrementa al emitir</p>
          </div>
        </div>
      </div>

      {/* Datos bancarios */}
      <div>
        <label className={LABEL}>Datos bancarios (para PDF)</label>
        <textarea name="bankDetails" rows={3} defaultValue={issuer.bankDetails ?? ''} className={TEXTAR}
          placeholder="IBAN: ES00 0000…&#10;BIC/SWIFT: XXXXX&#10;Banco: " />
      </div>

      {/* Crypto */}
      <div>
        <label className={LABEL}>Datos crypto (opcional)</label>
        <textarea name="cryptoDetails" rows={2} defaultValue={issuer.cryptoDetails ?? ''} className={TEXTAR}
          placeholder="USDT TRC20: T…" />
      </div>

      {/* Condiciones de pago por defecto */}
      <div>
        <label className={LABEL}>Condiciones de pago por defecto</label>
        <textarea name="defaultPaymentTerms" rows={2} defaultValue={issuer.defaultPaymentTerms ?? ''} className={TEXTAR}
          placeholder="Pago a 30 días desde la fecha de emisión" />
      </div>

      {/* Notas legales */}
      <div>
        <label className={LABEL}>Notas / texto legal por defecto</label>
        <textarea name="notes" rows={3} defaultValue={issuer.notes ?? ''} className={TEXTAR}
          placeholder="Invoice issued for international marketing services. VAT not applied…" />
        <p className="text-[9px] text-sp-admin-muted mt-1">Editable en cada factura individual. Validar con gestoría antes de usar.</p>
      </div>

      {state.error && (
        <p className="text-[12px] text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-sp-admin-border/60">
        <button type="button" onClick={onDone}
          className="h-8 px-4 rounded-lg border border-sp-admin-border text-[12px] text-sp-admin-muted hover:bg-sp-admin-hover transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={isPending}
          className="h-8 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors">
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

// ── Issuer Card ───────────────────────────────────────────────────────

function IssuerCard({ issuer, isAdmin }: { issuer: IssuerCompany; isAdmin: boolean }): React.ReactElement {
  const [editing, setEditing] = useState(false);

  const nextNum = String(issuer.nextInvoiceNumber ?? 1).padStart(4, '0');
  const year    = new Date().getFullYear();
  const exampleNum = `${issuer.invoiceSeriesPrefix}-${year}-${nextNum}`;

  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex items-start gap-3">
          {/* Avatar con iniciales */}
          <div className="w-10 h-10 rounded-xl bg-sp-admin-accent/10 flex items-center justify-center shrink-0">
            <span className="text-[14px] font-black text-sp-admin-accent">
              {(issuer.invoiceSeriesPrefix ?? 'SP').slice(0, 2)}
            </span>
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-sp-admin-text">{issuer.name}</h3>
            {issuer.legalName && (
              <p className="text-[11px] text-sp-admin-muted">{issuer.legalName}</p>
            )}
            {issuer.taxId && (
              <p className="text-[10px] text-sp-admin-muted mt-0.5">
                NIF: <span className="font-mono">{issuer.taxId}</span>
              </p>
            )}
          </div>
        </div>
        {isAdmin && !editing && (
          <button type="button" onClick={() => setEditing(true)}
            className="h-7 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors shrink-0">
            Editar
          </button>
        )}
      </div>

      {/* Info compacta */}
      {!editing && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-sp-admin-border/60 divide-x divide-sp-admin-border/40">
          {[
            { label: 'País',     value: issuer.country    ?? '—' },
            { label: 'Moneda',   value: issuer.defaultCurrency ?? 'EUR' },
            { label: 'Serie',    value: issuer.invoiceSeriesPrefix ?? '—' },
            { label: 'Próxima',  value: exampleNum },
          ].map((item) => (
            <div key={item.label} className="px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{item.label}</p>
              <p className="text-[12px] font-semibold text-sp-admin-text mt-0.5 font-mono">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Detalles extra en modo no-edición */}
      {!editing && issuer.bankDetails && (
        <div className="px-5 py-3 border-t border-sp-admin-border/40">
          <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted mb-1">Datos bancarios</p>
          <p className="text-[11px] text-sp-admin-muted font-mono whitespace-pre-line leading-relaxed">{issuer.bankDetails}</p>
        </div>
      )}

      {/* Formulario de edición */}
      {editing && (
        <IssuerEditForm issuer={issuer} onDone={() => setEditing(false)} />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export function IssuersManagerTab({ issuers, isAdmin }: Props): React.ReactElement {
  return (
    <div className="space-y-4">
      {/* Banner informativo */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <span className="text-blue-500 text-[15px] shrink-0 mt-0.5" aria-hidden>ℹ</span>
        <div>
          <p className="text-[12px] font-semibold text-blue-800">Empresas emisoras</p>
          <p className="text-[11px] text-blue-700/80 mt-0.5">
            Cada empresa tiene su propia serie de facturación independiente. Los textos legales deben ser validados por la gestoría antes de usarlos en facturas reales.
          </p>
        </div>
      </div>

      {issuers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-8 text-center">
          <p className="text-[13px] text-sp-admin-muted">No hay empresas emisoras configuradas.</p>
          <p className="text-[11px] text-sp-admin-muted/70 mt-1">Se crearán automáticamente al acceder por primera vez.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issuers.map((issuer) => (
            <IssuerCard key={issuer.id} issuer={issuer} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {!isAdmin && (
        <p className="text-[11px] text-sp-admin-muted text-center">
          Solo los administradores pueden editar las empresas emisoras.
        </p>
      )}
    </div>
  );
}
