import { notFound } from 'next/navigation';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { talents } from '@/db/schema';
import { TalentSeoBioPanel } from '@/features/admin/talents/components/TalentSeoBioPanel';

export default async function TalentSeoPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const talentId = Number(id);
  if (!Number.isInteger(talentId) || talentId <= 0) notFound();

  await requirePermission('talentos', 'write');

  const talent = await db.query.talents.findFirst({
    where: eq(talents.id, talentId),
  });
  if (!talent) notFound();

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-sp-admin-muted mb-5">
        <Link href="/admin/talents" className="hover:text-sp-admin-accent transition-colors">Influencers</Link>
        <span>›</span>
        <Link href={`/admin/talents/${talentId}`} className="hover:text-sp-admin-accent transition-colors">{talent.name}</Link>
        <span>›</span>
        <span className="text-sp-admin-text font-medium">SEO Bio</span>
      </div>

      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="font-display text-2xl font-black uppercase text-sp-admin-text">SEO Bio</h1>
        <span className="text-xs text-sp-admin-muted">{talent.name}</span>
      </div>
      <p className="text-sm text-sp-admin-muted mb-6">
        Genera y gestiona el contenido SEO del perfil público de{' '}
        <a
          href={`/talentos/${talent.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sp-admin-accent hover:underline"
        >
          /talentos/{talent.slug}
        </a>
        . La bio generada es un borrador — revísala antes de aprobar.
      </p>

      <div className="bg-sp-admin-card rounded-xl border border-sp-admin-border p-6">
        <TalentSeoBioPanel
          talentId={talent.id}
          talentName={talent.name}
          seoBioStatus={talent.seoBioStatus}
          seoBioGenerated={talent.seoBioGenerated}
          seoBioManual={talent.seoBioManual}
          seoTitle={talent.seoTitle}
          seoDescription={talent.seoDescription}
          seoKeywords={talent.seoKeywords}
        />
      </div>

      <div className="mt-4 text-[11px] text-sp-admin-muted">
        <strong>Prioridad de contenido en página pública:</strong>{' '}
        Bio manual → Bio generada → bioLong → bio corta → (oculto).
      </div>
    </div>
  );
}
