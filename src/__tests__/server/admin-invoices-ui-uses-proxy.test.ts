/**
 * Test estático: la UI admin de facturas usa el proxy /api/admin/facturacion/[id]/pdf
 * en lugar de URLs directas al Blob privado.
 *
 * NO aplica a:
 *   - `marcas/(portal)/facturas/page.tsx` (brand portal, auth distinta, scope futuro)
 *   - `ImportInbox.parts.tsx` (otra entidad: invoice_imports staging)
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf-8');
}

describe('UI admin de facturas usa el proxy /api/admin/facturacion/[id]/pdf', () => {
  it('InvoicesManager.parts.tsx construye el href apuntando al proxy admin', () => {
    const src = read('src/features/admin/invoices/components/InvoicesManager.parts.tsx');
    expect(src).toMatch(/\/api\/admin\/facturacion\/\$\{invoice\.id\}\/pdf/);
  });

  it('InvoicesManager.parts.tsx NO renderiza `<a href={invoice.invoiceFile?.url ?? invoice.fileUrl}>` directo', () => {
    const src = read('src/features/admin/invoices/components/InvoicesManager.parts.tsx');
    // Patrón legacy: href={attachmentUrl} con attachmentUrl = invoice.invoiceFile?.url ?? invoice.fileUrl
    // Permitido seguir comprobando si hay attachment para decidir el render (booleano),
    // lo que NO se permite es construir un href a la URL del Blob directamente.
    expect(src).not.toMatch(/href=\{invoice\.invoiceFile\?\.url\b/);
    expect(src).not.toMatch(/href=\{invoice\.fileUrl\}/);
  });

  it('BillingMovementModal.tsx href apunta al proxy admin, no a invoice.fileUrl directo', () => {
    const src = read('src/features/admin/invoices/components/BillingMovementModal.tsx');
    expect(src).toMatch(/\/api\/admin\/facturacion\/\$\{invoice\.id\}\/pdf/);
    expect(src).not.toMatch(/href=\{invoice\.fileUrl\}/);
  });
});
