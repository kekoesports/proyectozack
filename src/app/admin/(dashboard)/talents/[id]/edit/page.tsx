import { notFound } from 'next/navigation';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { talents } from '@/db/schema';
import { TalentProfileForm } from '@/features/admin/talents/components/TalentProfileForm';
import { TalentTagsEditor } from '@/features/admin/talents/components/TalentTagsEditor';

export default async function TalentProfileEditPage({
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
    with: { tags: true },
  });

  if (!talent) notFound();

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-sp-admin-muted mb-5">
        <Link href="/admin/talents" className="hover:text-sp-admin-accent transition-colors">
          Influencers
        </Link>
        <span>›</span>
        <Link href={`/admin/talents/${talentId}`} className="hover:text-sp-admin-accent transition-colors">
          {talent.name}
        </Link>
        <span>›</span>
        <span className="text-sp-admin-text font-medium">Editar perfil</span>
      </div>

      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="font-display text-2xl font-black uppercase text-sp-admin-text">
          {talent.name}
        </h1>
        <span className="text-xs text-sp-admin-muted">{talent.role}</span>
      </div>
      <p className="text-sm text-sp-admin-muted mb-6">
        Edita los datos principales del perfil público y del CRM.
      </p>

      <TalentProfileForm talent={talent} />
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5 mt-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-3">Etiquetas</h2>
        <TalentTagsEditor talentId={talent.id} initialTags={talent.tags} />
      </section>
    </div>
  );
}
