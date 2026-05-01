'use client';

import { useState } from 'react';
import { generateInvoicePdf } from '@/lib/pdf/generateInvoicePdf';
import type { IssuedInvoiceWithRelations, IssuerCompany, BillingClient } from '@/types';

type Props = {
  readonly invoice:  IssuedInvoiceWithRelations;
  readonly issuer:   IssuerCompany | undefined;
  readonly client:   BillingClient | undefined;
  readonly compact?: boolean;
};

/**
 * Botón que genera y descarga el PDF de una factura emitida.
 * La generación ocurre en el cliente (jsPDF).
 *
 * @kind client
 * @feature admin/invoices
 */
export function InvoicePdfButton({ invoice, issuer, client, compact = false }: Props): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleDownload(): Promise<void> {
    if (!issuer) { setError('Empresa emisora no encontrada'); return; }
    if (!client) { setError('Cliente no encontrado'); return; }

    setLoading(true);
    setError('');

    try {
      await generateInvoicePdf(invoice, issuer, client);
    } catch (err) {
      console.error('[PDF] Error generando factura:', err);
      setError('Error al generar el PDF. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <div>
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={loading}
          title={`Descargar PDF ${invoice.invoiceNumber}`}
          className="px-2 py-1 rounded text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent hover:bg-sp-admin-hover disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          {loading ? (
            <span className="inline-block w-3 h-3 border border-sp-admin-accent border-t-transparent rounded-full animate-spin" aria-hidden />
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M6 1v7M3 5l3 3 3-3M1 10h10"/>
            </svg>
          )}
          PDF
        </button>
        {error && <p className="text-[9px] text-red-500 mt-0.5 max-w-[120px]">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={loading}
        className="flex items-center gap-2 h-9 px-4 rounded-lg border border-sp-admin-border bg-sp-admin-card text-[12px] font-semibold text-sp-admin-text hover:bg-sp-admin-hover disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-sp-admin-accent border-t-transparent rounded-full animate-spin" aria-hidden />
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <path d="M7 1v9M3.5 6.5l3.5 3.5 3.5-3.5M1 12h12"/>
          </svg>
        )}
        {loading ? 'Generando…' : 'Descargar PDF'}
      </button>
      {error && (
        <p className="text-[11px] text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
