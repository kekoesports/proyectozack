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
