import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmBrands, talents } from '@/db/schema';
import { listImports } from '@/lib/queries/invoiceImports';
import { listTemplates } from '@/lib/queries/invoiceImportTemplates';
import { getUsedInvoiceCategories } from '@/lib/queries/invoices';
import { ImportInbox } from '@/features/admin/invoices/components/ImportInbox';
import { requirePermission } from '@/lib/permissions';

export default async function AdminInvoiceImportPage(): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');
  const [pending, reviewed, brandsList, talentsList, categories, templates] = await Promise.all([
    listImports('pending'),
    (async () => {
      const approved = await listImports('approved');
      const rejected = await listImports('rejected');
      return [...approved, ...rejected].sort((a, b) => {
        const ta = a.reviewedAt?.getTime() ?? 0;
        const tb = b.reviewedAt?.getTime() ?? 0;
        return tb - ta;
      });
    })(),
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
    getUsedInvoiceCategories(),
    listTemplates(),
  ]);

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-sp-admin-muted mb-1">
            <Link href="/admin/facturacion" className="hover:text-sp-admin-text transition-colors">← Facturación</Link>
          </p>
          <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">
            Importar Factura
          </h1>
          <p className="text-xs text-sp-admin-muted mt-1">
            Sube una factura en PDF. La IA extrae los datos automáticamente; revisa y confirma antes de guardar.
          </p>
        </div>
      </div>

      <ImportInbox
        pending={pending}
        reviewed={reviewed.slice(0, 20)}
        brands={brandsList}
        talents={talentsList}
        categories={categories}
        templates={templates}
      />
    </div>
  );
}
