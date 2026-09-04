import Link from 'next/link';
import { z } from 'zod';

import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { PartnerLeadsTable } from '@/features/admin/partnerLeads/components/PartnerLeadsTable';
import { hasPermission, requirePermission } from '@/lib/permissions';
import {
  getAllPartnerLeads,
  getRecentPartnerLeadBatches,
} from '@/lib/queries/partnerLeads';

export const metadata = { title: 'Partners CS2 | Admin' };

const BatchFilter = z.string().trim().min(1).max(80).optional();

type Props = {
  readonly searchParams: Promise<{ readonly batch?: string | string[] }>;
};

export default async function AdminPartnerLeadsPage({ searchParams }: Props): Promise<React.ReactElement> {
  const session = await requirePermission('leads', 'read');
  const canWrite = hasPermission(session.user.role, 'leads', 'write');
  const rawBatch = (await searchParams).batch;
  const parsedBatch = BatchFilter.safeParse(Array.isArray(rawBatch) ? rawBatch[0] : rawBatch);
  const batchFilter = parsedBatch.success ? parsedBatch.data : undefined;

  const [allLeads, batches] = await Promise.all([
    getAllPartnerLeads(),
    getRecentPartnerLeadBatches(),
  ]);
  const selectedBatch = batchFilter
    ? batches.find((batch) => batch.externalId === batchFilter)
    : undefined;
  const leads = selectedBatch
    ? allLeads.filter((lead) => lead.lastBatchId === selectedBatch.id)
    : allLeads;

  const actionable = allLeads.filter(
    (lead) => lead.recommendation !== 'discard' && lead.outreachStatus !== 'descartado',
  ).length;
  const green = allLeads.filter((lead) => lead.riskLevel === 'green').length;
  const pendingReview = allLeads.filter((lead) => lead.outreachStatus === 'nuevo').length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Partners CS2"
        subtitle="Leads comerciales verificados por el radar diario; el semáforo no sustituye revisión legal"
        stats={[
          { label: 'accionables', value: actionable, accent: '#5b9bd5' },
          { label: 'riesgo verde', value: green, accent: '#34d399' },
          { label: 'por revisar', value: pendingReview, accent: '#f59e0b' },
        ]}
      />

      {selectedBatch ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sp-admin-accent/30 bg-sp-admin-accent/5 px-4 py-3 text-sm">
          <span className="text-sp-admin-text">
            Mostrando el informe <strong>{selectedBatch.externalId}</strong>: {selectedBatch.reportSummary}
          </span>
          <Link href="/admin/partner-leads" className="text-sp-admin-accent hover:underline">
            Ver todos
          </Link>
        </div>
      ) : null}

      <section aria-labelledby="partner-runs-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="partner-runs-heading" className="font-display text-lg font-black uppercase text-sp-admin-text">
            Últimas ejecuciones
          </h2>
          <span className="text-xs text-sp-admin-muted">Discord confirma el envío con ACK</span>
        </div>
        {batches.length === 0 ? (
          <p className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4 text-sm text-sp-admin-muted">
            El radar todavía no ha importado ningún informe.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {batches.slice(0, 6).map((batch) => (
              <Link
                key={batch.id}
                href={`/admin/partner-leads?batch=${encodeURIComponent(batch.externalId)}`}
                className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4 hover:border-sp-admin-accent/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-sp-admin-text">{batch.researchedAt.toISOString().slice(0, 10)}</strong>
                  <span className={batch.discordNotifiedAt ? 'text-emerald-400 text-xs' : 'text-amber-400 text-xs'}>
                    {batch.discordNotifiedAt ? 'Discord enviado' : 'Discord pendiente'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-sp-admin-muted line-clamp-2">{batch.reportSummary}</p>
                <p className="mt-3 text-xs tabular-nums text-sp-admin-text">
                  {batch.newLeadCount} nuevos · {batch.updatedLeadCount} revisados · {batch.discardedCount} descartes
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <PartnerLeadsTable items={leads} canWrite={canWrite} />
    </div>
  );
}
