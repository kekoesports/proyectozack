import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { talents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getTalentBusiness, getTalentVerticals } from '@/lib/queries/talentBusiness';
import { TalentBusinessForm } from '@/features/admin/talents/components/TalentBusinessForm';

export default async function TalentBusinessPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const { id } = await params;
  const talentId = Number(id);
  if (!Number.isInteger(talentId) || talentId <= 0) notFound();

  const [talent, business, verticals] = await Promise.all([
    db.query.talents.findFirst({ where: eq(talents.id, talentId) }),
    getTalentBusiness(talentId),
    getTalentVerticals(talentId),
  ]);

  if (!talent) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/talents" className="text-xs text-sp-admin-muted hover:text-sp-admin-text inline-flex items-center gap-1 mb-4">
        ← Volver al roster
      </Link>
      <div className="flex items-baseline gap-4 mb-2">
        <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text">{talent.name}</h1>
        <span className="text-xs text-sp-admin-muted">{talent.role}</span>
      </div>
      <p className="text-sm text-sp-admin-muted mb-8">Datos de negocio y contacto interno</p>

      <TalentBusinessForm talentId={talentId} business={business} verticals={verticals} />
    </div>
  );
}
