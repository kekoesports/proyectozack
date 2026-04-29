'use client';

import { useState } from 'react';
import { trpcClient } from '@/lib/trpc/client';

type Quarter = 1 | 2 | 3 | 4;
type Modelo = '303' | '130' | '347';

type FiscalExportsProps = {
  readonly years: readonly number[];
  readonly defaultYear: number;
  readonly defaultQuarter: Quarter;
};

const INPUT =
  'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const LABEL = 'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';
const CARD = 'rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5';
const BTN_PRIMARY =
  'inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer';

function triggerDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Panel de exports fiscales por empresa, año y trimestre (genera ficheros descargables).
 *
 * @kind client
 * @feature admin/invoices
 * @route /admin/facturacion/exports
 */
export function FiscalExports({ years, defaultYear, defaultQuarter }: FiscalExportsProps): React.ReactElement {
  const [year, setYear] = useState<number>(defaultYear);
  const [quarter, setQuarter] = useState<Quarter>(defaultQuarter);
  const [downloading, setDownloading] = useState<Modelo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(modelo: Modelo): Promise<void> {
    setDownloading(modelo);
    setError(null);
    try {
      const result = await trpcClient.invoices.exportCsv.query({
        modelo,
        year,
        ...(modelo !== '347' ? { quarter } : {}),
      });
      triggerDownload(result.csv, result.filename);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar el archivo';
      setError(msg);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
          <div>
            <label className={LABEL}>Año</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={INPUT}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Trimestre (303 y 130)</label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value) as Quarter)}
              className={INPUT}
            >
              <option value={1}>T1 (ene-mar)</option>
              <option value={2}>T2 (abr-jun)</option>
              <option value={3}>T3 (jul-sep)</option>
              <option value={4}>T4 (oct-dic)</option>
            </select>
          </div>
        </div>
        {error && (
          <p className="mt-3 text-xs text-red-500">{error}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ExportCard
          title="Modelo 303"
          subtitle="IVA trimestral"
          description="Base imponible + cuota de IVA repercutido y soportado, por tipo. Resultado a ingresar."
          loading={downloading === '303'}
          disabled={downloading !== null}
          onDownload={() => void download('303')}
        />
        <ExportCard
          title="Modelo 130"
          subtitle="IRPF pago fraccionado"
          description="Ingresos - gastos acumulados YTD hasta fin del trimestre. Pago fraccionado bruto al 20%."
          loading={downloading === '130'}
          disabled={downloading !== null}
          onDownload={() => void download('130')}
        />
        <ExportCard
          title="Modelo 347"
          subtitle="Operaciones con terceros"
          description={`Contrapartes cuyo acumulado anual supera 3.005,06 € IVA incluido (${year}).`}
          loading={downloading === '347'}
          disabled={downloading !== null}
          onDownload={() => void download('347')}
        />
      </div>

      <p className="text-xs text-sp-admin-muted">
        Los CSV usan <code className="font-mono">;</code> como separador para abrirse bien en Excel español. Incluyen BOM UTF-8.
      </p>
    </div>
  );
}

function ExportCard({
  title,
  subtitle,
  description,
  loading,
  disabled,
  onDownload,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly loading: boolean;
  readonly disabled: boolean;
  readonly onDownload: () => void;
}): React.ReactElement {
  return (
    <div className={`${CARD} flex flex-col h-full`}>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">{subtitle}</p>
      <h3 className="font-display text-2xl font-black text-sp-admin-text mt-1">{title}</h3>
      <p className="text-xs text-sp-admin-muted mt-2 flex-1">{description}</p>
      <button
        type="button"
        onClick={onDownload}
        disabled={disabled}
        className={`${BTN_PRIMARY} mt-4 w-full`}
      >
        {loading ? 'Generando…' : 'Descargar CSV'}
      </button>
    </div>
  );
}
