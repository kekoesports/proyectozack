/**
 * Tests estáticos: la UI admin ya no expone URLs directas de blob privado.
 *
 * Regresión que se está cerrando: PR #115 (2026-06-29) cambió `uploadFile()`
 * a `access: 'private'`. Cualquier `<a href={file.url}>` / `<a href={contract.fileUrl}>` /
 * `<a href={imp.fileUrl}>` posterior a esa fecha devuelve 401 al abrirse.
 *
 * Estos tests fallan si un futuro cambio vuelve a introducir un href al blob privado
 * directo en cualquiera de los 4 archivos protegidos.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');
}

describe('UI admin — archivos polimórficos usan /api/admin/files/[id]', () => {
  const REL = 'src/features/admin/campaigns/components/CampaignFiles.parts.tsx';

  it('CampaignFiles.parts.tsx enlaza al proxy /api/admin/files/[id]', () => {
    const src = read(REL);
    expect(src).toMatch(/\/api\/admin\/files\/\$\{file\.id\}/);
  });

  it('CampaignFiles.parts.tsx NO renderiza `<a href={file.url}>` directo', () => {
    const src = read(REL);
    expect(src).not.toMatch(/href=\{file\.url\}/);
  });
});

describe('UI admin — FilesList usa /api/admin/files/[id]', () => {
  const REL = 'src/features/admin/files/components/FilesList.tsx';

  it('FilesList.tsx enlaza al proxy /api/admin/files/[id]', () => {
    const src = read(REL);
    expect(src).toMatch(/\/api\/admin\/files\/\$\{file\.id\}/);
  });

  it('FilesList.tsx NO renderiza `<a href={file.url}>` directo', () => {
    const src = read(REL);
    expect(src).not.toMatch(/href=\{file\.url\}/);
  });
});

describe('UI admin — ContractTab usa /api/admin/campanas/[id]/contract/pdf', () => {
  const REL = 'src/features/admin/_shared/components/campaigns/ContractTab.tsx';

  it('ContractTab.tsx enlaza al proxy admin de contrato de campaña', () => {
    const src = read(REL);
    expect(src).toMatch(/\/api\/admin\/campanas\/\$\{campaignId\}\/contract\/pdf/);
  });

  it('ContractTab.tsx NO renderiza `<a href={contract.fileUrl}>` directo', () => {
    const src = read(REL);
    expect(src).not.toMatch(/href=\{contract\.fileUrl\}/);
  });
});

describe('UI admin — ImportInbox usa /api/admin/facturacion/import/[id]/pdf', () => {
  const REL = 'src/features/admin/invoices/components/ImportInbox.parts.tsx';

  it('ImportInbox.parts.tsx enlaza al proxy admin de invoice_imports', () => {
    const src = read(REL);
    expect(src).toMatch(/\/api\/admin\/facturacion\/import\/\$\{imp\.id\}\/pdf/);
  });

  it('ImportInbox.parts.tsx NO renderiza `<a href={imp.fileUrl}>` directo', () => {
    const src = read(REL);
    expect(src).not.toMatch(/href=\{imp\.fileUrl\}/);
  });
});

// ── Finance dashboard — fuga cerrada 2026-07-07 (PR-E) ────────────────
//
// Cuatro sitios se quedaron fuera del sweep de PR #217 porque grepaban por
// `<a href={file.url}>` y estos usan `<Link href={pdfHref}>` construido con
// un ternario inline. Además hardcodeaban una ruta INEXISTENTE `/api/admin/facturas/`
// (typo — la ruta real es `/api/admin/facturacion/`). El fallback en null
// caía a `row.fileUrl` directo al Blob privado.
//
// Estos tests fallan si vuelve a colarse el typo o el fallback al Blob.

const FINANCE_DASHBOARD_FILES = [
  'src/features/admin/finance-dashboard/components/nominas-creadores/NominasInternasTabla.tsx',
  'src/features/admin/finance-dashboard/components/nominas-creadores/PagosTalentosTabla.tsx',
  'src/features/admin/finance-dashboard/components/gastos/GastosTabla.tsx',
  'src/lib/queries/financeDashboard/arAging.ts',
] as const;

describe('finance-dashboard — ninguno enlaza a la ruta inexistente /api/admin/facturas/', () => {
  it.each(FINANCE_DASHBOARD_FILES)('%s no menciona /api/admin/facturas/', (rel) => {
    const src = read(rel);
    // Cualquier substring que arranque en `/api/admin/facturas/` es error de tipeo.
    // El helper correcto emite `/api/admin/facturacion/${id}/pdf`.
    expect(src).not.toMatch(/\/api\/admin\/facturas\//);
  });
});

describe('finance-dashboard — usa buildInvoicePdfUrl (evita fallback a row.fileUrl privado)', () => {
  it.each(FINANCE_DASHBOARD_FILES)('%s importa buildInvoicePdfUrl', (rel) => {
    const src = read(rel);
    expect(src).toMatch(/import\s*\{[^}]*buildInvoicePdfUrl[^}]*\}\s*from\s*['"][^'"]*expenseSubgroups['"]/);
  });

  it.each(FINANCE_DASHBOARD_FILES)('%s NO cae a row.fileUrl ni r.fileUrl como fallback', (rel) => {
    const src = read(rel);
    // El patrón peligroso: `(row.fileUrl ?? ...)` o `(r.fileUrl ?? ...)` dentro
    // de la construcción del href/pdfUrl. Con el helper el fallback se decide
    // dentro de buildInvoicePdfUrl y nunca retorna la URL del blob privado.
    expect(src).not.toMatch(/\?\?\s*row\.fileUrl/);
    expect(src).not.toMatch(/\?\?\s*r\.fileUrl/);
  });
});

describe('finance-dashboard — el helper buildInvoicePdfUrl sigue apuntando al proxy correcto', () => {
  it('expenseSubgroups.ts devuelve /api/admin/facturacion/${id}/pdf', () => {
    const src = read('src/lib/queries/financeDashboard/expenseSubgroups.ts');
    expect(src).toMatch(/`\/api\/admin\/facturacion\/\$\{input\.id\}\/pdf`/);
    expect(src).not.toMatch(/\/api\/admin\/facturas\//);
  });
});
