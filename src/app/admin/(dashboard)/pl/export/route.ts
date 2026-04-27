import { NextResponse, type NextRequest } from 'next/server';

import { requireAnyRole } from '@/lib/auth-guard';
import { getPnL } from '@/lib/queries/pnl';
import { startOfLocalYearIso, todayLocalIso } from '@/lib/utils/date';

import type { InvoiceCompany } from '@/types';
import type { PnLFilters } from '@/lib/queries/pnl';

const VALID_COMPANIES: readonly string[] = [
  'spain',
  'andorra',
  'argentina',
  'spain_andorra',
  'spain_argentina',
];

/**
 * CSV escape with formula injection defense.
 *
 * Excel/Numbers/LibreOffice treat cells starting with `=`, `+`, `-`, `@`, `\t`, `\r`
 * as formulas — `=HYPERLINK(...)` or `=cmd|...` can exfiltrate data or run code on
 * legacy Excel/DDE-enabled clients. Since `invoices.category` is user-controlled
 * free text, we MUST neutralise these prefixes before serialising.
 *
 * Strategy: prefix any "dangerous" leading char with `'` (treated as literal text),
 * then quote-and-escape if the value contains delimiters or newlines.
 */
function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let stringValue = String(value);
  if (/^[=+\-@\t\r]/.test(stringValue)) {
    stringValue = `'${stringValue}`;
  }
  if (/["';\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function defaultRange(): { from: string; to: string } {
  // Use LOCAL Y/M/D — `toISOString()` would shift to UTC and rebobinate
  // a day in any tz east of UTC.
  return { from: startOfLocalYearIso(), to: todayLocalIso() };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const url = new URL(request.url);
  const fallback = defaultRange();
  const company = url.searchParams.get('company') ?? '';
  const from = url.searchParams.get('from') ?? fallback.from;
  const to = url.searchParams.get('to') ?? fallback.to;
  const brandIdRaw = url.searchParams.get('brandId') ?? '';
  const talentIdRaw = url.searchParams.get('talentId') ?? '';

  const filters: PnLFilters = {
    from,
    to,
    ...(VALID_COMPANIES.includes(company) ? { company: company as InvoiceCompany } : {}),
    ...(brandIdRaw && /^\d+$/.test(brandIdRaw) ? { brandId: Number(brandIdRaw) } : {}),
    ...(talentIdRaw && /^\d+$/.test(talentIdRaw) ? { talentId: Number(talentIdRaw) } : {}),
  };

  const pnl = await getPnL(filters);

  const lines: string[] = [];
  lines.push(['Sección', 'Etiqueta', 'Importe (EUR)'].join(';'));
  lines.push(['Resumen', 'Ingresos', pnl.ingresos.toFixed(2)].map(escapeCsv).join(';'));
  lines.push(['Resumen', 'Gastos', pnl.gastos.toFixed(2)].map(escapeCsv).join(';'));
  lines.push(['Resumen', 'Pagos creadores', pnl.pagosCreadores.toFixed(2)].map(escapeCsv).join(';'));
  lines.push(['Resumen', 'Comisión agencia', pnl.comisionAgencia.toFixed(2)].map(escapeCsv).join(';'));
  lines.push(['Resumen', 'Margen bruto', pnl.margenBruto.toFixed(2)].map(escapeCsv).join(';'));
  lines.push(['Resumen', 'Pendiente cobro', pnl.pendienteCobro.toFixed(2)].map(escapeCsv).join(';'));
  lines.push(['Resumen', 'Pendiente pago', pnl.pendientePago.toFixed(2)].map(escapeCsv).join(';'));

  lines.push('');
  lines.push(['Mes', 'Ingresos', 'Gastos', 'Neto'].join(';'));
  for (const row of pnl.breakdownByMonth) {
    lines.push([row.month, row.ingresos.toFixed(2), row.gastos.toFixed(2), row.neto.toFixed(2)].map(escapeCsv).join(';'));
  }

  lines.push('');
  lines.push(['Categoría gasto', 'Total', 'Facturas'].join(';'));
  for (const row of pnl.breakdownByCategory) {
    lines.push([row.category, row.total.toFixed(2), String(row.count)].map(escapeCsv).join(';'));
  }

  const body = '\uFEFF' + lines.join('\r\n');
  // Sanitise filename — only allow safe ASCII (defense vs Content-Disposition header injection).
  const safeFilename = `pnl-${from}-${to}${company ? `-${company}` : ''}.csv`.replace(/[^\w.\-]/g, '_');

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
