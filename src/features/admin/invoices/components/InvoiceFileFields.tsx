'use client';

import type { FileRecord } from '@/types';

const INPUT =
  'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors file:mr-3 file:rounded-full file:border-0 file:bg-sp-admin-card file:px-3 file:py-1 file:text-xs file:font-semibold file:text-sp-admin-text';
const LABEL =
  'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';

type SlotProps = {
  readonly id: string;
  readonly name: 'invoiceFile' | 'statementFile';
  readonly label: string;
  readonly current: FileRecord | null | undefined;
};

function FileSlot({ id, name, label, current }: SlotProps): React.ReactElement {
  return (
    <div>
      <label className={LABEL} htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className={INPUT}
      />
      {current ? (
        <p className="mt-1 text-xs text-sp-admin-muted">
          Adjunto actual:{' '}
          <a href={current.url} target="_blank" rel="noreferrer" className="text-sp-admin-accent hover:underline">
            {current.name}
          </a>{' '}
          — sube uno nuevo para reemplazarlo.
        </p>
      ) : (
        <p className="mt-1 text-[10px] uppercase tracking-wider text-sp-admin-muted/70">
          Opcional · PDF, JPG, PNG, WebP — máx 10 MB
        </p>
      )}
    </div>
  );
}

type Props = {
  readonly invoiceFile?: FileRecord | null;
  readonly statementFile?: FileRecord | null;
};

/**
 * Campos de upload (factura + extracto bancario) que persisten en Vercel Blob y devuelven la URL al formulario.
 *
 * @kind client
 * @feature admin/invoices
 * @route /admin/facturacion
 */
export function InvoiceFileFields({ invoiceFile, statementFile }: Props): React.ReactElement {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FileSlot
        id="invoice-attachment-invoice"
        name="invoiceFile"
        label="Factura adjunta"
        current={invoiceFile}
      />
      <FileSlot
        id="invoice-attachment-statement"
        name="statementFile"
        label="Extracto bancario"
        current={statementFile}
      />
    </div>
  );
}
