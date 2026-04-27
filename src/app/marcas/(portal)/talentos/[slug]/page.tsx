import { notFound } from 'next/navigation';
import Image from 'next/image';
import { requireRole } from '@/lib/auth-guard';
import { getTalentBySlug } from '@/lib/queries/talents';
import { getTalentCampaignsForBrand } from '@/lib/queries/brands';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { gradientStyle } from '@/lib/utils/gradient';
import { BrandTalentFichaClient } from '@/features/brand-portal/components/BrandTalentFichaClient';

type PageProps = {
  params: Promise<{ slug: string }>;
}

export default async function BrandTalentFichaPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await requireRole('brand', '/marcas/login');
  const talent = await getTalentBySlug(slug);
  if (!talent || talent.status !== 'active') notFound();

  const campaigns = await getTalentCampaignsForBrand(session.user.id, talent.id);
  const grad = gradientStyle(talent.gradientC1, talent.gradientC2);

  return (
    <div>
      {/* Hero */}
      <div className="relative h-64 rounded-2xl overflow-hidden mb-8" style={{ background: grad }}>
        {talent.photoUrl ? (
          <Image src={talent.photoUrl} alt={talent.name} fill className="object-cover object-top" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-8xl font-black text-white/80">{talent.initials}</span>
          </div>
        )}
        <StatusBadge status={talent.status} className="absolute top-4 right-4" />
      </div>

      {/* Name + role */}
      <h1 className="font-display text-4xl font-black uppercase text-sp-dark">{talent.name}</h1>
      <p className="text-sm text-sp-muted mb-6">{talent.role}</p>

      {/* Stats */}
      <div className="flex gap-6 mb-6">
        {talent.stats.map((stat) => (
          <div key={stat.id}>
            <div className="font-display text-2xl font-black gradient-text">{stat.value}</div>
            <div className="text-xs text-sp-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Bio + tags */}
      <p className="text-sm text-sp-dark/80 leading-relaxed mb-4">{talent.bio}</p>
      <div className="flex flex-wrap gap-2 mb-8">
        {talent.tags.map((t) => (
          <span key={t.id} className="text-xs px-3 py-1 rounded-full bg-sp-off text-sp-muted border border-sp-border">
            {t.tag}
          </span>
        ))}
      </div>

      {/* Campaign history with this brand */}
      <h2 className="font-display text-xl font-black uppercase text-sp-dark mb-4">Historial de campanas</h2>
      {campaigns.length === 0 ? (
        <div className="rounded-2xl bg-white border border-sp-border p-6 mb-8">
          <p className="text-sm text-sp-muted">Aun no has trabajado con este talento.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white border border-sp-border p-5">
              <p className="font-bold text-sp-dark">{c.caseStudy?.title ?? 'Campana'}</p>
              <p className="text-xs text-sp-muted2">{new Date(c.createdAt).toLocaleDateString('es-ES')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Socials */}
      <div className="flex items-center gap-3 mb-8">
        {talent.socials.map((s) => (
          <a
            key={s.id}
            href={s.profileUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
            style={{ backgroundColor: `${s.hexColor}20` }}
            aria-label={s.platform}
          >
            <SocialIcon type={s.platform} color={s.hexColor} size={14} />
          </a>
        ))}
      </div>

      {/* CTA — Client component for modal */}
      <BrandTalentFichaClient talentId={talent.id} talentName={talent.name} />
    </div>
  );
}
