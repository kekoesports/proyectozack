'use client';

import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

// ── Campos destino del CRM ────────────────────────────────────────────

type CrmField = {
  readonly key:    string;
  readonly label:  string;
  readonly group:  'trato' | 'movimiento' | 'marca' | 'talento' | 'fecha' | 'ignorar';
  readonly hint?:  string;
};

const CRM_FIELDS: readonly CrmField[] = [
  // Trato
  { key: 'deal_name',       label: 'Nombre del trato',      group: 'trato',     hint: 'Ej: LarcPlay Abril 2025' },
  { key: 'brand_name',      label: 'Marca / Cliente',       group: 'marca',     hint: 'Se buscará en marcas CRM' },
  { key: 'talent_name',     label: 'Talento / Creador',     group: 'talento',   hint: 'Se buscará en talentos CRM' },
  { key: 'amount_brand',    label: 'Pago de marca (€)',     group: 'trato',     hint: 'Importe que paga la marca' },
  { key: 'amount_talent',   label: 'Pago a talento (€)',    group: 'trato',     hint: 'Importe que cobra el talento' },
  { key: 'agency_fee',      label: 'Comisión agencia (€)',  group: 'trato',     hint: 'Margen de la agencia' },
  { key: 'agency_fee_pct',  label: 'Comisión % agencia',    group: 'trato',     hint: 'Porcentaje de comisión' },
  { key: 'currency',        label: 'Divisa',                group: 'trato',     hint: 'EUR, USD, GBP…' },
  { key: 'deal_status',     label: 'Estado del trato',      group: 'trato',     hint: 'pendiente, completado…' },
  { key: 'brand_paid',      label: '¿Marca pagó?',          group: 'trato',     hint: 'sí / no / true / false' },
  { key: 'talent_paid',     label: '¿Talento cobró?',       group: 'trato',     hint: 'sí / no / true / false' },
  { key: 'sector',          label: 'Sector',                group: 'trato',     hint: 'casino, cs2, esports…' },
  { key: 'deal_notes',      label: 'Notas del trato',       group: 'trato' },
  // Movimiento financiero
  { key: 'mov_concept',     label: 'Concepto movimiento',   group: 'movimiento' },
  { key: 'mov_amount',      label: 'Importe movimiento',    group: 'movimiento' },
  { key: 'mov_kind',        label: 'Ingreso / Gasto',       group: 'movimiento', hint: 'income / expense' },
  { key: 'mov_category',    label: 'Categoría',             group: 'movimiento' },
  { key: 'mov_entity',      label: 'Entidad SocialPro',     group: 'movimiento', hint: 'SocialPro España…' },
  // Fechas
  { key: 'start_date',      label: 'Fecha inicio',          group: 'fecha' },
  { key: 'end_date',        label: 'Fecha fin',             group: 'fecha' },
  { key: 'payment_date',    label: 'Fecha de pago',         group: 'fecha' },
  // Ignorar
  { key: '_ignore',         label: '— Ignorar columna —',   group: 'ignorar' },
];

const GROUP_LABELS: Record<CrmField['group'], string> = {
  trato:      'Trato / Deal',
  movimiento: 'Movimiento financiero',
  marca:      'Marca / Brand',
  talento:    'Talento / Influencer',
  fecha:      'Fechas',
  ignorar:    'Otros',
};

// ── Auto-detect de columnas ───────────────────────────────────────────

function normalizeHeader(h: string): string {
  return h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

const AUTO_MAP: Record<string, string> = {
  'campana': 'deal_name', 'campaign': 'deal_name', 'trato': 'deal_name', 'deal': 'deal_name', 'nombre': 'deal_name',
  'creador': 'talent_name', 'influencer': 'talent_name', 'talent': 'talent_name', 'streamer': 'talent_name',
  'marca': 'brand_name', 'brand': 'brand_name', 'cliente': 'brand_name',
  'pagototal': 'amount_brand', 'total': 'amount_brand', 'importe': 'amount_brand', 'amount': 'amount_brand',
  'pagomarca': 'amount_brand', 'ingresoagencia': 'amount_brand',
  'pagoinfluencer': 'amount_talent', 'pagotalento': 'amount_talent', 'costalento': 'amount_talent',
  'comision': 'agency_fee', 'fee': 'agency_fee', 'comisionagencia': 'agency_fee',
  'comisionporcentaje': 'agency_fee_pct', 'pctcomision': 'agency_fee_pct',
  'divisa': 'currency', 'currency': 'currency', 'moneda': 'currency',
  'estado': 'deal_status', 'status': 'deal_status', 'estatus': 'deal_status',
  'notas': 'deal_notes', 'notes': 'deal_notes', 'comentarios': 'deal_notes', 'observaciones': 'deal_notes',
  'sector': 'sector',
  'fecha': 'start_date', 'fechainicio': 'start_date', 'inicio': 'start_date',
  'fechafin': 'end_date', 'fin': 'end_date', 'vencimiento': 'end_date',
  'fechapago': 'payment_date',
  'marcapago': 'brand_paid', 'cobrado': 'brand_paid', 'pagado': 'brand_paid',
  'talentopago': 'talent_paid', 'talentocobo': 'talent_paid',
};

function autoDetect(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const h of headers) {
    const norm = normalizeHeader(h);
    result[h] = AUTO_MAP[norm] ?? '_ignore';
  }
  return result;
}

// ── Tipos internos ────────────────────────────────────────────────────

type ParsedFile = {
  readonly headers:  string[];
  readonly rows:     Record<string, string>[];
  readonly filename: string;
  readonly totalRows: number;
};

type Step = 'upload' | 'preview' | 'mapping';

const INPUT_SM = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

// ── Componente principal ──────────────────────────────────────────────

export function AccountingImporter(): React.ReactElement {
  const [step,       setStep]       = useState<Step>('upload');
  const [parsed,     setParsed]     = useState<ParsedFile | null>(null);
  const [mapping,    setMapping]    = useState<Record<string, string>>({});
  const [dragging,   setDragging]   = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function parseFile(file: File): Promise<void> {
    setParseError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) { setParseError('El archivo no tiene hojas de datos.'); return; }
      const ws = wb.Sheets[sheetName]!;
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      if (rawRows.length === 0) { setParseError('El archivo está vacío o no tiene datos.'); return; }

      const headers = Object.keys(rawRows[0]!);
      const rows    = rawRows.map((r) =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '').trim()])),
      );

      setParsed({ headers, rows, filename: file.name, totalRows: rawRows.length });
      setMapping(autoDetect(headers));
      setStep('preview');
    } catch (err) {
      setParseError(`Error al leer el archivo: ${err instanceof Error ? err.message : 'desconocido'}`);
    }
  }

  function onDrop(e: React.DragEvent): void {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void parseFile(file);
  }

  function reset(): void {
    setStep('upload'); setParsed(null); setMapping({}); setParseError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Instrucciones */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5">
        <h3 className="font-bold text-sp-admin-text text-sm mb-1">Importar datos contables desde Excel</h3>
        <p className="text-[12px] text-sp-admin-muted">
          Sube tu hoja de cálculo histórica con tratos, pagos y movimientos. El sistema detectará las columnas automáticamente y te permitirá revisarlo todo antes de importar.
        </p>
        <div className="mt-3 flex items-center gap-3 text-[10px]">
          {(['upload', 'preview', 'mapping'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-sp-admin-muted/40">→</span>}
              <span className={`font-semibold ${step === s ? 'text-sp-admin-accent' : step > s ? 'text-emerald-600' : 'text-sp-admin-muted/50'}`}>
                {i + 1}. {s === 'upload' ? 'Subir archivo' : s === 'preview' ? 'Vista previa' : 'Mapeo de columnas'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* PASO 1: Upload */}
      {step === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed cursor-pointer p-12 text-center transition-colors ${
            dragging ? 'border-sp-admin-accent bg-sp-admin-accent/5' : 'border-sp-admin-border hover:border-sp-admin-accent/40 bg-sp-admin-card'
          }`}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.csv,text/csv" className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void parseFile(f); }} />
          <p className="text-4xl mb-3">📊</p>
          <p className="font-bold text-sp-admin-text text-sm">Arrastra tu Excel o CSV aquí</p>
          <p className="text-[11px] text-sp-admin-muted mt-1">Formatos: .xlsx · .csv · máx 20 MB</p>
          {parseError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700 font-medium">
              ⚠ {parseError}
            </div>
          )}
        </div>
      )}

      {/* PASO 2: Preview */}
      {step === 'preview' && parsed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-sp-admin-text text-sm">{parsed.filename}</p>
              <p className="text-[11px] text-sp-admin-muted">
                {parsed.totalRows} filas · {parsed.headers.length} columnas
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={reset} className={`${INPUT_SM} px-3`}>← Cambiar archivo</button>
              <button type="button" onClick={() => setStep('mapping')}
                className="h-8 px-4 rounded-lg bg-sp-admin-accent text-white text-[12px] font-bold hover:bg-sp-admin-accent/90 transition-colors">
                Mapear columnas →
              </button>
            </div>
          </div>

          {/* Tabla preview */}
          <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-sp-admin-border bg-sp-admin-hover/40">
                  <th className="px-2 py-2 text-[8px] font-bold text-sp-admin-muted uppercase tracking-wide text-left w-8">#</th>
                  {parsed.headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-[8px] font-bold text-sp-admin-muted uppercase tracking-wide text-left whitespace-nowrap max-w-[160px] truncate">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 8).map((row, i) => (
                  <tr key={i} className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover/30">
                    <td className="px-2 py-2 text-sp-admin-muted/40 tabular-nums">{i + 1}</td>
                    {parsed.headers.map((h) => (
                      <td key={h} className="px-3 py-2 text-sp-admin-text max-w-[160px] truncate">{row[h] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.totalRows > 8 && (
              <p className="px-4 py-2 text-[10px] text-sp-admin-muted/60 border-t border-sp-admin-border/40">
                Mostrando 8 de {parsed.totalRows} filas
              </p>
            )}
          </div>
        </div>
      )}

      {/* PASO 3: Mapeo de columnas */}
      {step === 'mapping' && parsed && (
        <ColumnMappingStep
          parsed={parsed}
          mapping={mapping}
          onMappingChange={setMapping}
          onBack={() => setStep('preview')}
          onReset={reset}
        />
      )}
    </div>
  );
}

// ── Paso 3: Mapeo ─────────────────────────────────────────────────────

type MappingProps = {
  readonly parsed:          ParsedFile;
  readonly mapping:         Record<string, string>;
  readonly onMappingChange: (m: Record<string, string>) => void;
  readonly onBack:          () => void;
  readonly onReset:         () => void;
};

function ColumnMappingStep({ parsed, mapping, onMappingChange, onBack, onReset }: MappingProps): React.ReactElement {
  const mappedCount  = Object.values(mapping).filter((v) => v !== '_ignore').length;
  const ignoredCount = Object.values(mapping).filter((v) => v === '_ignore').length;

  // Muestra 3 valores de muestra por columna
  function sampleValues(col: string): string {
    return parsed.rows
      .slice(0, 10)
      .map((r) => r[col] ?? '')
      .filter(Boolean)
      .slice(0, 3)
      .join(' · ') || '—';
  }

  function autoRedetect(): void {
    onMappingChange(autoDetect(parsed.headers));
  }

  const grouped = useMemo(() => {
    const g: Record<string, CrmField[]> = {};
    for (const f of CRM_FIELDS) {
      if (!g[f.group]) g[f.group] = [];
      g[f.group]!.push(f);
    }
    return g;
  }, []);

  // Summary of what will be imported
  const summary = useMemo(() => {
    const fields = Object.entries(mapping).filter(([, v]) => v !== '_ignore').map(([, v]) => v);
    const hasDeal     = fields.some((f) => f.startsWith('deal_') || f === 'amount_brand' || f === 'amount_talent');
    const hasMovement = fields.some((f) => f.startsWith('mov_'));
    const hasBrand    = fields.includes('brand_name');
    const hasTalent   = fields.includes('talent_name');
    return { hasDeal, hasMovement, hasBrand, hasTalent };
  }, [mapping]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-semibold text-sp-admin-text text-sm">Mapeo de columnas</p>
          <p className="text-[11px] text-sp-admin-muted">
            {parsed.headers.length} columnas detectadas · {mappedCount} mapeadas · {ignoredCount} ignoradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={autoRedetect}
            className="h-8 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
            Auto-detectar
          </button>
          <button type="button" onClick={onBack}
            className="h-8 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
            ← Vista previa
          </button>
        </div>
      </div>

      {/* Tabla de mapeo */}
      <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/30 grid grid-cols-3 gap-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">Columna del Excel</p>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">Campo del CRM</p>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">Muestra de valores</p>
        </div>
        <div className="divide-y divide-sp-admin-border/40">
          {parsed.headers.map((col) => {
            const val        = mapping[col] ?? '_ignore';
            const isIgnored  = val === '_ignore';
            const crmField   = CRM_FIELDS.find((f) => f.key === val);
            return (
              <div key={col} className={`grid grid-cols-3 gap-4 px-4 py-3 items-center transition-colors ${isIgnored ? 'opacity-50' : 'hover:bg-sp-admin-hover/20'}`}>
                {/* Nombre columna Excel */}
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-sp-admin-text truncate">{col}</p>
                  {crmField && !isIgnored && (
                    <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full inline-block mt-0.5"
                      style={{
                        background: crmField.group === 'trato' ? '#f0fdf4' : crmField.group === 'movimiento' ? '#fff7ed' : '#f0f9ff',
                        color: crmField.group === 'trato' ? '#16a34a' : crmField.group === 'movimiento' ? '#d97706' : '#0284c7',
                      }}>
                      {GROUP_LABELS[crmField.group]}
                    </span>
                  )}
                </div>
                {/* Selector CRM */}
                <div>
                  <select
                    value={val}
                    onChange={(e) => onMappingChange({ ...mapping, [col]: e.target.value })}
                    className="w-full h-8 rounded-lg border border-sp-admin-border bg-white px-2 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    {Object.entries(grouped).map(([groupKey, fields]) => (
                      <optgroup key={groupKey} label={GROUP_LABELS[groupKey as CrmField['group']] ?? groupKey}>
                        {fields.map((f) => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {crmField?.hint && !isIgnored && (
                    <p className="text-[9px] text-sp-admin-muted/60 mt-0.5 truncate">{crmField.hint}</p>
                  )}
                </div>
                {/* Muestra */}
                <p className="text-[11px] text-sp-admin-muted truncate">{sampleValues(col)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen de lo que se importaría */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-hover/20 p-4 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sp-admin-muted mb-2">Resumen del mapeo</p>
        <div className="flex flex-wrap gap-2">
          {summary.hasDeal && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
              ✓ Tratos / Deals
            </span>
          )}
          {summary.hasBrand && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-semibold">
              ✓ Marcas
            </span>
          )}
          {summary.hasTalent && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
              ✓ Talentos
            </span>
          )}
          {summary.hasMovement && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
              ✓ Movimientos financieros
            </span>
          )}
          {!summary.hasDeal && !summary.hasMovement && !summary.hasBrand && !summary.hasTalent && (
            <span className="text-[11px] text-sp-admin-muted">Mapea al menos una columna para continuar.</span>
          )}
        </div>
        <p className="text-[10px] text-sp-admin-muted/70 pt-1">
          {parsed.totalRows} filas · La validación y normalización se hará en el siguiente paso (Fase 3).
        </p>
      </div>

      {/* CTA — preparado para Fase 3 */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={onReset}
          className="text-[11px] text-sp-admin-muted hover:text-sp-admin-text underline transition-colors">
          Cancelar e importar otro archivo
        </button>
        <button
          type="button"
          disabled={!summary.hasDeal && !summary.hasMovement}
          title="La validación e importación real se habilitará en la siguiente fase"
          className="h-9 px-5 rounded-lg bg-sp-admin-accent/30 text-sp-admin-accent text-[12px] font-bold border border-sp-admin-accent/40 cursor-not-allowed"
        >
          Validar y normalizar datos → (Fase 3)
        </button>
      </div>
    </div>
  );
}
