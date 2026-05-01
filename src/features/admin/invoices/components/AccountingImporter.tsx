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

type Step = 'upload' | 'preview' | 'mapping' | 'validation';

// ── Normalización ─────────────────────────────────────────────────────

const VALID_DEAL_STATUSES = ['propuesta', 'negociacion', 'aprobada', 'activa', 'completada', 'cancelada', 'pendiente_pago', 'pagada'] as const;

const STATUS_ALIAS: Record<string, string> = {
  pendiente:    'propuesta',
  'en negociacion': 'negociacion',
  'en_negociacion': 'negociacion',
  activo:       'activa',
  active:       'activa',
  completed:    'completada',
  completado:   'completada',
  finalizado:   'completada',
  cancelled:    'cancelada',
  cancelado:    'cancelada',
  pagado:       'pagada',
  paid:         'pagada',
  'pendiente de cobro': 'pendiente_pago',
  en_agencia:   'activa',
};

function cleanAmount(raw: string | undefined): { value: number | null; error?: string } {
  if (!raw || raw.trim() === '' || raw === '-' || raw === '—') return { value: null };
  const s = raw.trim();
  if (s.includes('#DIV') || s.includes('#REF') || s.includes('#N/A') || s.includes('#VALUE')) {
    return { value: null, error: `Error Excel: ${s}` };
  }
  // Quitar símbolos de moneda, espacios, separadores de miles
  const cleaned = s.replace(/[€$£%\s]/g, '')
                    .replace(/\.(?=\d{3}(?:[,.]|$))/g, '') // separador miles punto
                    .replace(',', '.');                      // coma decimal → punto
  const n = parseFloat(cleaned);
  if (isNaN(n)) return { value: null, error: `Importe no válido: "${raw}"` };
  return { value: Math.round(n * 100) / 100 };
}

function cleanDate(raw: string | undefined): { value: string | null; error?: string } {
  if (!raw || raw.trim() === '' || raw === '-' || raw === '—') return { value: null };
  const s = raw.trim();
  // DD/MM/YYYY o DD-MM-YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) return { value: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { value: s };
  // Número de serie Excel (días desde 1900-01-01)
  const serial = Number(s);
  if (!isNaN(serial) && serial > 1 && serial < 100000) {
    const d = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return { value: d.toISOString().slice(0, 10) };
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return { value: parsed.toISOString().slice(0, 10) };
  return { value: null, error: `Fecha no reconocida: "${raw}"` };
}

function normalizeStatus(raw: string | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  const s = raw.trim().toLowerCase();
  if (VALID_DEAL_STATUSES.includes(s as typeof VALID_DEAL_STATUSES[number])) return s;
  return STATUS_ALIAS[s] ?? null;
}

function normalizeBoolean(raw: string | undefined): boolean | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (['sí', 'si', 'yes', 'true', '1', 'x', '✓', 'pagado', 'cobrado'].includes(s)) return true;
  if (['no', 'false', '0', '-', ''].includes(s)) return false;
  return null;
}

// ── Fila normalizada ──────────────────────────────────────────────────

type NormalizedRow = {
  readonly rowIndex:   number;
  readonly raw:        Record<string, string>;
  readonly data:       Record<string, unknown>;
  readonly errors:     string[];
  readonly warnings:   string[];
  readonly isValid:    boolean;
};

function normalizeRows(parsed: ParsedFile, mapping: Record<string, string>): NormalizedRow[] {
  return parsed.rows.map((row, idx) => {
    const data: Record<string, unknown> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [col, field] of Object.entries(mapping)) {
      if (field === '_ignore') continue;
      const raw = row[col] ?? '';

      if (['amount_brand', 'amount_talent', 'agency_fee', 'mov_amount'].includes(field)) {
        const { value, error } = cleanAmount(raw);
        if (error) errors.push(error);
        data[field] = value;
      } else if (['start_date', 'end_date', 'payment_date'].includes(field)) {
        const { value, error } = cleanDate(raw);
        if (error) warnings.push(error);
        data[field] = value;
      } else if (field === 'deal_status') {
        const status = normalizeStatus(raw);
        if (raw && !status) warnings.push(`Estado desconocido: "${raw}" — se omitirá`);
        data[field] = status;
      } else if (['brand_paid', 'talent_paid'].includes(field)) {
        data[field] = normalizeBoolean(raw);
      } else if (field === 'currency') {
        const cur = raw.trim().toUpperCase();
        data[field] = ['EUR', 'USD', 'GBP', 'CHF'].includes(cur) ? cur : (cur || 'EUR');
      } else {
        data[field] = raw.trim() || null;
      }
    }

    // Validaciones de negocio
    const dealName  = data['deal_name']   as string | null;
    const brandName = data['brand_name']  as string | null;
    const amountBrand = data['amount_brand'] as number | null;

    if (!dealName && !brandName) {
      warnings.push('Sin nombre de trato ni marca — fila puede ser difícil de identificar');
    }
    if (amountBrand !== null && amountBrand < 0) {
      warnings.push('El pago de marca es negativo');
    }
    const amountTalent = data['amount_talent'] as number | null;
    if (amountBrand !== null && amountTalent !== null && amountTalent > amountBrand) {
      warnings.push('El pago al talento supera el pago de la marca');
    }

    return {
      rowIndex: idx + 1,
      raw:      row,
      data,
      errors,
      warnings,
      isValid:  errors.length === 0,
    };
  });
}

const INPUT_SM = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

// ── Componente principal ──────────────────────────────────────────────

export function AccountingImporter(): React.ReactElement {
  const [step,           setStep]       = useState<Step>('upload');
  const [parsed,         setParsed]     = useState<ParsedFile | null>(null);
  const [mapping,        setMapping]    = useState<Record<string, string>>({});
  const [dragging,       setDragging]   = useState(false);
  const [parseError,     setParseError] = useState<string | null>(null);
  const [normalizedRows, setNormalizedRows] = useState<NormalizedRow[]>([]);
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
    setStep('upload'); setParsed(null); setMapping({}); setParseError(null); setNormalizedRows([]);
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
          onValidate={() => {
            const rows = normalizeRows(parsed, mapping);
            setNormalizedRows(rows);
            setStep('validation');
          }}
        />
      )}

      {/* PASO 4: Validación y normalización */}
      {step === 'validation' && parsed && normalizedRows.length > 0 && (
        <ValidationStep
          rows={normalizedRows}
          mapping={mapping}
          onBack={() => setStep('mapping')}
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
  readonly onValidate:      () => void;
};

function ColumnMappingStep({ parsed, mapping, onMappingChange, onBack, onReset, onValidate }: MappingProps): React.ReactElement {
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

      {/* CTA — habilitado: validar datos */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={onReset}
          className="text-[11px] text-sp-admin-muted hover:text-sp-admin-text underline transition-colors">
          Cancelar e importar otro archivo
        </button>
        <button
          type="button"
          disabled={!summary.hasDeal && !summary.hasMovement}
          onClick={onValidate}
          className={`h-9 px-5 rounded-lg text-[12px] font-bold transition-colors ${
            summary.hasDeal || summary.hasMovement
              ? 'bg-sp-admin-accent text-white hover:bg-sp-admin-accent/90 active:scale-95'
              : 'bg-sp-admin-accent/30 text-sp-admin-accent border border-sp-admin-accent/40 cursor-not-allowed'
          }`}
        >
          Validar y normalizar datos →
        </button>
      </div>
    </div>
  );
}

// ── Paso 4: Validación ────────────────────────────────────────────────

type ValidationProps = {
  readonly rows:     readonly NormalizedRow[];
  readonly mapping:  Record<string, string>;
  readonly onBack:   () => void;
  readonly onReset:  () => void;
};

function ValidationStep({ rows, mapping, onBack, onReset }: ValidationProps): React.ReactElement {
  const valid   = rows.filter((r) => r.isValid);
  const invalid = rows.filter((r) => !r.isValid);
  const withWarnings = rows.filter((r) => r.isValid && r.warnings.length > 0);

  // Columnas mapeadas (no ignoradas)
  const mappedFields = [...new Set(Object.values(mapping).filter((v) => v !== '_ignore'))];
  const fieldLabels: Record<string, string> = {};
  for (const f of CRM_FIELDS) fieldLabels[f.key] = f.label;

  const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
  function fmtValue(field: string, val: unknown): string {
    if (val === null || val === undefined || val === '') return '—';
    if (['amount_brand', 'amount_talent', 'agency_fee', 'mov_amount'].includes(field)) {
      return typeof val === 'number' ? EUR.format(val) : String(val);
    }
    if (typeof val === 'boolean') return val ? 'Sí' : 'No';
    return String(val);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-semibold text-sp-admin-text text-sm">Validación y normalización</p>
          <p className="text-[11px] text-sp-admin-muted mt-0.5">
            Revisa los datos antes de importar. Solo se importarán las filas válidas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack}
            className="h-8 px-3 rounded-lg border border-sp-admin-border text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
            ← Cambiar mapeo
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total filas',        value: rows.length,          color: '#72728a' },
          { label: 'Válidas',            value: valid.length,         color: '#16a34a' },
          { label: 'Con avisos',         value: withWarnings.length,  color: '#f59e0b' },
          { label: 'Con errores',        value: invalid.length,       color: invalid.length > 0 ? '#ef4444' : '#72728a' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-sp-admin-card border border-sp-admin-border overflow-hidden">
            <div className="h-[2px]" style={{ background: s.color }} />
            <div className="px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{s.label}</p>
              <p className="text-[20px] font-black mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Errores críticos */}
      {invalid.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-1">
          <p className="text-[11px] font-bold text-red-800">
            {invalid.length} {invalid.length === 1 ? 'fila' : 'filas'} con errores — se omitirán en la importación:
          </p>
          {invalid.slice(0, 5).map((r) => (
            <div key={r.rowIndex} className="text-[10px] text-red-700">
              <span className="font-mono font-bold">Fila {r.rowIndex}:</span> {r.errors.join(' · ')}
            </div>
          ))}
          {invalid.length > 5 && (
            <p className="text-[10px] text-red-600">… y {invalid.length - 5} más</p>
          )}
        </div>
      )}

      {/* Avisos */}
      {withWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
          <p className="text-[11px] font-bold text-amber-800">
            {withWarnings.length} {withWarnings.length === 1 ? 'fila' : 'filas'} con avisos (se importarán de todas formas):
          </p>
          {withWarnings.slice(0, 3).map((r) => (
            <div key={r.rowIndex} className="text-[10px] text-amber-700">
              <span className="font-mono font-bold">Fila {r.rowIndex}:</span> {r.warnings.join(' · ')}
            </div>
          ))}
          {withWarnings.length > 3 && (
            <p className="text-[10px] text-amber-600">… y {withWarnings.length - 3} más</p>
          )}
        </div>
      )}

      {/* Tabla de datos normalizados */}
      <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border overflow-hidden overflow-x-auto">
        <div className="px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/30 flex items-center gap-2">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">
            Datos normalizados — {valid.length} filas válidas
          </p>
        </div>
        <table className="w-full text-[11px] min-w-[600px]">
          <thead>
            <tr className="border-b border-sp-admin-border/50">
              <th className="px-3 py-2 text-[8px] font-bold text-sp-admin-muted uppercase tracking-wide text-left w-10">#</th>
              <th className="px-3 py-2 text-[8px] font-bold text-sp-admin-muted uppercase tracking-wide text-left w-16">Estado</th>
              {mappedFields.slice(0, 6).map((f) => (
                <th key={f} className="px-3 py-2 text-[8px] font-bold text-sp-admin-muted uppercase tracking-wide text-left whitespace-nowrap">
                  {fieldLabels[f] ?? f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 20).map((row) => (
              <tr key={row.rowIndex}
                className={`border-b border-sp-admin-border/30 last:border-0 transition-colors ${
                  !row.isValid ? 'bg-red-50/50' : row.warnings.length > 0 ? 'bg-amber-50/30' : 'hover:bg-sp-admin-hover/20'
                }`}>
                <td className="px-3 py-2 text-sp-admin-muted/50 tabular-nums">{row.rowIndex}</td>
                <td className="px-3 py-2">
                  {!row.isValid ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"/>Error
                    </span>
                  ) : row.warnings.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"/>Aviso
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"/>OK
                    </span>
                  )}
                </td>
                {mappedFields.slice(0, 6).map((f) => (
                  <td key={f} className="px-3 py-2 text-sp-admin-text max-w-[140px] truncate">
                    {fmtValue(f, row.data[f])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 20 && (
          <p className="px-4 py-2 text-[10px] text-sp-admin-muted/60 border-t border-sp-admin-border/40">
            Mostrando 20 de {rows.length} filas
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between pt-2 border-t border-sp-admin-border/60">
        <button type="button" onClick={onReset}
          className="text-[11px] text-sp-admin-muted hover:text-sp-admin-text underline transition-colors">
          Cancelar e importar otro archivo
        </button>
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-sp-admin-muted">
            {valid.length} filas listas para importar
            {invalid.length > 0 && ` · ${invalid.length} serán omitidas`}
          </p>
          {valid.length > 0 ? (
            <div className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-[12px] font-semibold">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <path d="M7 2L12 11H2L7 2Z"/><path d="M7 6v2" strokeLinecap="round"/><circle cx="7" cy="10" r="0.5" fill="currentColor"/>
              </svg>
              Importación real — próxima fase
            </div>
          ) : (
            <p className="text-[11px] text-red-500 font-medium">
              Sin filas válidas para importar. Revisa los errores.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
