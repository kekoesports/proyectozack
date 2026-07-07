'use client';

import { useState, useRef, useEffect } from 'react';
import { generateInvoicePdf, type PdfLanguage } from '@/lib/pdf/generateInvoicePdf';
import type { IssuedInvoiceWithRelations, IssuerCompany, BillingClient } from '@/types';

type Props = {
  readonly invoice:  IssuedInvoiceWithRelations;
  readonly issuer:   IssuerCompany | undefined;
  readonly client:   BillingClient | undefined;
  readonly compact?: boolean;
};

/**
 * Botón que genera y descarga el PDF de una factura emitida.
 *
 * Idioma:
 *   - Descarga rápida (botón principal) usa `client.pdfLanguage` (default 'en').
 *   - Un botón "▾" adyacente abre override puntual con opciones ES/EN sin
 *     tocar la config del cliente.
 *
 * @kind client
 * @feature admin/invoices
 */
export function InvoicePdfButton({ invoice, issuer, client, compact = false }: Props): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const clientLang: PdfLanguage = client?.pdfLanguage === 'es' ? 'es' : 'en';

  // Cerrar menu al click fuera
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  async function handleDownload(override?: PdfLanguage): Promise<void> {
    if (!issuer) { setError('Empresa emisora no encontrada'); return; }
    if (!client) { setError('Cliente no encontrado'); return; }

    setLoading(true);
    setError('');
    setMenuOpen(false);

    try {
      await generateInvoicePdf(invoice, issuer, client, override);
    } catch (err) {
      console.error('[PDF] Error generando factura:', err);
      setError('Error al generar el PDF. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <div className="relative inline-flex items-center" ref={menuRef}>
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={loading}
          title={`Descargar PDF ${invoice.invoiceNumber} (${clientLang.toUpperCase()})`}
          className="pl-2 pr-1.5 py-1 rounded-l text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent hover:bg-sp-admin-hover disabled:opacity-50 transition-colors flex items-center gap-1"
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
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={loading}
          title="Elegir idioma"
          aria-label="Elegir idioma del PDF"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="px-1 py-1 rounded-r border-l border-sp-admin-border/60 text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent hover:bg-sp-admin-hover disabled:opacity-50 transition-colors"
        >
          ▾
        </button>
        {menuOpen && (
          <PdfLanguageMenu clientLang={clientLang} onPick={(lang) => void handleDownload(lang)} />
        )}
        {error && <p className="text-[9px] text-red-500 mt-0.5 max-w-[120px] absolute top-full left-0">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative inline-flex flex-col items-start" ref={menuRef}>
      <div className="inline-flex items-stretch">
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={loading}
          className="flex items-center gap-2 h-9 pl-4 pr-3 rounded-l-lg border border-sp-admin-border bg-sp-admin-card text-[12px] font-semibold text-sp-admin-text hover:bg-sp-admin-hover disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-sp-admin-accent border-t-transparent rounded-full animate-spin" aria-hidden />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M7 1v9M3.5 6.5l3.5 3.5 3.5-3.5M1 12h12"/>
            </svg>
          )}
          {loading ? 'Generando…' : `Descargar PDF (${clientLang.toUpperCase()})`}
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={loading}
          aria-label="Elegir idioma del PDF"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex items-center justify-center h-9 w-8 rounded-r-lg border border-l-0 border-sp-admin-border bg-sp-admin-card text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover disabled:opacity-50 transition-colors"
        >
          ▾
        </button>
      </div>
      {menuOpen && (
        <PdfLanguageMenu clientLang={clientLang} onPick={(lang) => void handleDownload(lang)} />
      )}
      {error && (
        <p className="text-[11px] text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

// ── Menu de override ──────────────────────────────────────────────────

function PdfLanguageMenu({
  clientLang,
  onPick,
}: {
  readonly clientLang: PdfLanguage;
  readonly onPick: (lang: PdfLanguage) => void;
}): React.ReactElement {
  return (
    <div
      role="menu"
      className="absolute top-full left-0 mt-1 z-10 min-w-[190px] rounded-lg border border-sp-admin-border bg-sp-admin-card shadow-lg py-1"
    >
      <p className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-sp-admin-muted border-b border-sp-admin-border/60">
        Forzar idioma
      </p>
      <button
        type="button"
        role="menuitem"
        onClick={() => onPick('en')}
        className="w-full text-left px-3 py-1.5 text-[11px] text-sp-admin-text hover:bg-sp-admin-hover transition-colors flex items-center justify-between"
      >
        <span>English</span>
        {clientLang === 'en' && <span className="text-[9px] text-sp-admin-muted">default</span>}
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => onPick('es')}
        className="w-full text-left px-3 py-1.5 text-[11px] text-sp-admin-text hover:bg-sp-admin-hover transition-colors flex items-center justify-between"
      >
        <span>Español</span>
        {clientLang === 'es' && <span className="text-[9px] text-sp-admin-muted">default</span>}
      </button>
    </div>
  );
}
